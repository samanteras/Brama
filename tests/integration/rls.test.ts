import { afterAll, beforeAll, describe, expect, it } from 'vitest'

import { adminClient, anonClient, createTestUser, deleteTestUsers, type TestUser } from './helpers'

/**
 * Row level security, verified against the real database.
 *
 * These are the highest-value tests in the project. A policy with a typo looks
 * exactly like a correct one, and the failure mode is not a broken page — it is
 * one customer reading another customer's leads. Nothing but an actual query
 * proves the policies hold.
 */
describe('row level security', () => {
  let owner: TestUser
  let stranger: TestUser
  let botId: string
  let documentId: string
  let conversationId: string
  let leadId: string

  beforeAll(async () => {
    owner = await createTestUser('owner')
    stranger = await createTestUser('stranger')

    const admin = adminClient()

    const { data: bot, error: botError } = await admin
      .from('bots')
      .insert({ owner_id: owner.id, name: 'Skyline Renovations' })
      .select()
      .single()
    if (botError) throw new Error(botError.message)
    botId = bot.id

    const { data: document, error: documentError } = await admin
      .from('documents')
      .insert({
        bot_id: botId,
        filename: 'price-list.pdf',
        source_type: 'pdf',
        content_hash: `hash-${Date.now()}`,
        status: 'ready',
      })
      .select()
      .single()
    if (documentError) throw new Error(documentError.message)
    documentId = document.id

    const { error: chunkError } = await admin.from('chunks').insert({
      document_id: documentId,
      bot_id: botId,
      chunk_index: 0,
      content: 'Turnkey renovation starts at 520 EUR per square metre.',
    })
    if (chunkError) throw new Error(chunkError.message)

    const { data: conversation, error: conversationError } = await admin
      .from('conversations')
      .insert({ bot_id: botId, source: 'widget', visitor_id: 'visitor-1' })
      .select()
      .single()
    if (conversationError) throw new Error(conversationError.message)
    conversationId = conversation.id

    const { error: messageError } = await admin.from('messages').insert({
      conversation_id: conversationId,
      role: 'user',
      content: 'Do you handle demolition?',
    })
    if (messageError) throw new Error(messageError.message)

    const { data: lead, error: leadError } = await admin
      .from('leads')
      .insert({ bot_id: botId, conversation_id: conversationId, phone: '+48601234567' })
      .select()
      .single()
    if (leadError) throw new Error(leadError.message)
    leadId = lead.id
  })

  afterAll(async () => {
    await deleteTestUsers([owner, stranger])
  })

  describe('the owner', () => {
    it('sees their own bot', async () => {
      const { data } = await owner.client.from('bots').select('id').eq('id', botId)
      expect(data).toHaveLength(1)
    })

    it('sees their own documents', async () => {
      const { data } = await owner.client.from('documents').select('id').eq('id', documentId)
      expect(data).toHaveLength(1)
    })

    it('sees their own chunks', async () => {
      const { data } = await owner.client.from('chunks').select('id').eq('bot_id', botId)
      expect(data).toHaveLength(1)
    })

    it('sees their own conversations', async () => {
      const { data } = await owner.client.from('conversations').select('id').eq('bot_id', botId)
      expect(data).toHaveLength(1)
    })

    it('sees messages from their own conversations', async () => {
      const { data } = await owner.client
        .from('messages')
        .select('id')
        .eq('conversation_id', conversationId)
      expect(data).toHaveLength(1)
    })

    it('sees their own leads', async () => {
      const { data } = await owner.client.from('leads').select('id').eq('bot_id', botId)
      expect(data).toHaveLength(1)
    })

    it('sees their own profile', async () => {
      const { data } = await owner.client.from('profiles').select('id').eq('id', owner.id)
      expect(data).toHaveLength(1)
    })
  })

  describe('a different tenant', () => {
    it.each([
      ['bots', 'bots'],
      ['documents', 'documents'],
      ['chunks', 'chunks'],
      ['conversations', 'conversations'],
      ['leads', 'leads'],
    ] as const)('cannot read %s belonging to someone else', async (_label, table) => {
      const { data } = await stranger.client.from(table).select('id')
      expect(data).toEqual([])
    })

    it('cannot read messages belonging to someone else', async () => {
      const { data } = await stranger.client.from('messages').select('id')
      expect(data).toEqual([])
    })

    it('cannot read another profile', async () => {
      const { data } = await stranger.client.from('profiles').select('id').eq('id', owner.id)
      expect(data).toEqual([])
    })

    it('cannot rename another tenant bot', async () => {
      await stranger.client.from('bots').update({ name: 'hijacked' }).eq('id', botId)

      const { data } = await adminClient().from('bots').select('name').eq('id', botId).single()
      expect(data?.name).toBe('Skyline Renovations')
    })

    it('cannot delete another tenant bot', async () => {
      await stranger.client.from('bots').delete().eq('id', botId)

      const { data } = await adminClient().from('bots').select('id').eq('id', botId)
      expect(data).toHaveLength(1)
    })

    it('cannot delete another tenant lead', async () => {
      await stranger.client.from('leads').delete().eq('id', leadId)

      const { data } = await adminClient().from('leads').select('id').eq('id', leadId)
      expect(data).toHaveLength(1)
    })

    it('cannot reassign a bot to itself by inserting with a foreign owner', async () => {
      const { error } = await stranger.client
        .from('bots')
        .insert({ owner_id: owner.id, name: 'planted' })

      expect(error).not.toBeNull()
    })
  })

  describe('plan escalation', () => {
    it('cannot upgrade its own plan', async () => {
      // profiles has no update policy at all: a user who could write this row
      // would simply grant themselves the top tier.
      await stranger.client.from('profiles').update({ plan: 'business' }).eq('id', stranger.id)

      const { data } = await adminClient()
        .from('profiles')
        .select('plan')
        .eq('id', stranger.id)
        .single()

      expect(data?.plan).toBe('free')
    })

    it('starts every new account on the free plan', async () => {
      const { data } = await adminClient()
        .from('profiles')
        .select('plan')
        .eq('id', owner.id)
        .single()

      expect(data?.plan).toBe('free')
    })
  })

  describe('an anonymous visitor', () => {
    it.each([
      ['bots', 'bots'],
      ['documents', 'documents'],
      ['chunks', 'chunks'],
      ['leads', 'leads'],
      ['profiles', 'profiles'],
      ['usage', 'usage'],
      ['stripe_events', 'stripe_events'],
    ] as const)('reads nothing from %s', async (_label, table) => {
      // Widget visitors never touch the database directly; their requests go
      // through server routes that authorize explicitly.
      const { data } = await anonClient().from(table).select('*')
      expect(data ?? []).toEqual([])
    })
  })
})
