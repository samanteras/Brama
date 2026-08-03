import { notFound } from 'next/navigation'

import { EmbeddedChat } from './embedded-chat'
import { getPlan, toPlanId } from '@/lib/plans'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * The chat as it runs inside the widget iframe on a customer's website.
 *
 * Loaded with the service role because the visitor is anonymous — there is no
 * session for a policy to evaluate. Only presentation fields are read here; the
 * decision to answer is made per message in the public chat route.
 *
 * An iframe rather than injecting into the host page: it guarantees the
 * customer's CSS cannot break the chat and, more importantly, that our CSS
 * cannot break their site. The cost is that requests from inside the frame
 * carry our origin rather than theirs, which is why the host page's name is
 * passed through explicitly below.
 */
export default async function EmbedPage(props: PageProps<'/embed/[botId]'>) {
  const { botId } = await props.params
  const { host } = await props.searchParams

  const admin = createAdminClient()

  const { data: bot } = await admin
    .from('bots')
    .select('id, name, greeting, accent_color, is_active, owner_id')
    .eq('id', botId)
    .maybeSingle()

  if (!bot || !bot.is_active) notFound()

  const { data: profile } = await admin
    .from('profiles')
    .select('plan')
    .eq('id', bot.owner_id)
    .maybeSingle()

  const plan = getPlan(toPlanId(profile?.plan))

  return (
    <EmbeddedChat
      botId={bot.id}
      botName={bot.name}
      greeting={bot.greeting}
      accentColor={bot.accent_color}
      showWatermark={plan.features.watermark}
      hostSite={typeof host === 'string' ? host : null}
    />
  )
}
