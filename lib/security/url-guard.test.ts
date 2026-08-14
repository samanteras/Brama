import { describe, expect, it } from 'vitest'

import { assertPublicHost, assertWebUrl, BlockedUrlError, isPrivateAddress } from './url-guard'

describe('isPrivateAddress', () => {
  it.each([
    '127.0.0.1',
    '127.255.255.254',
    '10.0.0.1',
    '172.16.0.1',
    '172.31.255.255',
    '192.168.1.1',
    '169.254.169.254', // cloud metadata
    '0.0.0.0',
    '100.64.0.1', // CGNAT
    '192.0.0.192',
    '198.18.0.1',
    '224.0.0.1',
    '255.255.255.255',
  ])('blocks IPv4 %s', (ip) => {
    expect(isPrivateAddress(ip)).toBe(true)
  })

  it.each(['::1', '::', 'fc00::1', 'fd12:3456::1', 'fe80::1', 'ff02::1'])(
    'blocks IPv6 %s',
    (ip) => {
      expect(isPrivateAddress(ip)).toBe(true)
    },
  )

  it('blocks IPv4-mapped IPv6 by its payload', () => {
    expect(isPrivateAddress('::ffff:127.0.0.1')).toBe(true)
    expect(isPrivateAddress('::ffff:93.184.216.34')).toBe(false)
  })

  it.each(['93.184.216.34', '8.8.8.8', '172.32.0.1', '100.128.0.1', '2606:2800:220:1::1'])(
    'allows public %s',
    (ip) => {
      expect(isPrivateAddress(ip)).toBe(false)
    },
  )

  it('treats malformed addresses as hostile', () => {
    expect(isPrivateAddress('999.1.1.1')).toBe(true)
    expect(isPrivateAddress('not-an-ip')).toBe(true)
  })
})

describe('assertWebUrl', () => {
  it('allows plain https and http', () => {
    expect(() => assertWebUrl(new URL('https://example.com/'))).not.toThrow()
    expect(() => assertWebUrl(new URL('http://example.com/page'))).not.toThrow()
  })

  it.each([
    ['ftp://example.com/', 'blocked-scheme'],
    ['file:///etc/passwd', 'blocked-scheme'],
    ['https://example.com:8443/', 'blocked-port'],
    ['http://example.com:6379/', 'blocked-port'],
    ['https://user:pass@example.com/', 'blocked-host'],
  ] as const)('rejects %s', (url, code) => {
    expect(() => assertWebUrl(new URL(url))).toThrowError(
      expect.objectContaining({ code }) as Error,
    )
  })
})

describe('assertPublicHost', () => {
  const resolveTo =
    (...addresses: string[]) =>
    () =>
      Promise.resolve(addresses.map((address) => ({ address })))

  it('passes a hostname resolving only to public addresses', async () => {
    await expect(
      assertPublicHost(new URL('https://example.com/'), resolveTo('93.184.216.34')),
    ).resolves.toBeUndefined()
  })

  it('rejects when any resolved address is private', async () => {
    await expect(
      assertPublicHost(new URL('https://example.com/'), resolveTo('93.184.216.34', '10.0.0.5')),
    ).rejects.toThrowError(BlockedUrlError)
  })

  it('rejects hostnames that do not resolve', async () => {
    await expect(
      assertPublicHost(new URL('https://example.com/'), () => Promise.reject(new Error('ENOTFOUND'))),
    ).rejects.toThrowError(expect.objectContaining({ code: 'unresolvable-host' }) as Error)
  })

  it('judges IP literals without consulting DNS', async () => {
    const neverResolve = () => Promise.reject(new Error('must not be called'))

    await expect(
      assertPublicHost(new URL('https://127.0.0.1/'), neverResolve),
    ).rejects.toThrowError(expect.objectContaining({ code: 'blocked-host' }) as Error)

    await expect(
      assertPublicHost(new URL('https://[::1]/'), neverResolve),
    ).rejects.toThrowError(expect.objectContaining({ code: 'blocked-host' }) as Error)

    await expect(
      assertPublicHost(new URL('https://93.184.216.34/'), neverResolve),
    ).resolves.toBeUndefined()
  })
})
