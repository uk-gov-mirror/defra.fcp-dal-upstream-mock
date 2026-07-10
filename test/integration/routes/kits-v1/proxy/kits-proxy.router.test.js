import Hapi from '@hapi/hapi'

const mockFetch = vi.fn()
vi.mock('undici', () => ({
  fetch: mockFetch,
  EnvHttpProxyAgent: class {
    constructor() {}
  }
}))

vi.mock('node:tls', () => ({
  default: { createSecureContext: vi.fn().mockReturnValue({}) }
}))

const INTERNAL_URL = 'http://internal-gateway.test'
const EXTERNAL_URL = 'http://external-gateway.test'

vi.mock('../../../../../src/common/helpers/logging/logger.js', () => ({
  createLogger: () => ({ debug: vi.fn(), info: vi.fn(), warn: vi.fn(), error: vi.fn() })
}))

let mockMTLSConfig = {
  internal: { cert: 'internal-cert', key: 'internal-key' },
  external: { cert: 'external-cert', key: 'external-key' }
}

vi.mock('../../../../../src/config.js', () => ({
  config: {
    get: (key) =>
      ({
        'kitsProxy.internal.gatewayUrl': INTERNAL_URL,
        'kitsProxy.external.gatewayUrl': EXTERNAL_URL,
        'kitsProxy.gatewayTimeoutMs': 5000
      })[key],
    get decodedKitsMTLS() {
      return mockMTLSConfig
    }
  }
}))

const mockUpstreamResponse = ({ body = {}, status = 200, headers = {} } = {}) => {
  const encoded = new TextEncoder().encode(JSON.stringify(body))
  mockFetch.mockResolvedValueOnce({
    status,
    arrayBuffer: async () => encoded.buffer,
    headers: new Headers({ 'Content-Type': 'application/json', ...headers })
  })
}

/**
 * This is a bit of a hybrid integration/unit test.  The proxy route is tested by starting a real
 * Hapi server, but the upstream is mocked.  This validates routing, header filtering, and status code
 * pass-through without a live upstream.
 */
describe('KITS Proxy router', () => {
  let server

  beforeAll(async () => {
    const { router } = await import('../../../../../src/routes/proxy/kits-proxy.router.js')
    server = Hapi.server()
    await server.register(router)
    await server.initialize()
  })

  afterAll(async () => {
    await server?.stop({ timeout: 0 })
  })

  beforeEach(() => {
    mockFetch.mockReset()
  })

  describe('/internal/extapi', () => {
    test('forwards GET to the internal gateway URL', async () => {
      mockUpstreamResponse({ body: { _data: { id: 123 } } })

      const response = await server.inject({
        method: 'GET',
        url: '/internal/extapi/person/123/summary'
      })

      expect(response.statusCode).toBe(200)
      expect(mockFetch).toHaveBeenCalledWith(
        `${INTERNAL_URL}/person/123/summary`,
        expect.objectContaining({ method: 'get' })
      )
    })
  })

  describe('/external/extapi', () => {
    test('forwards GET to the external gateway URL', async () => {
      mockUpstreamResponse({ body: { _data: { id: 123 } } })

      const response = await server.inject({
        method: 'GET',
        url: '/external/extapi/person/123/summary'
      })

      expect(response.statusCode).toBe(200)
      expect(mockFetch).toHaveBeenCalledWith(
        `${EXTERNAL_URL}/person/123/summary`,
        expect.objectContaining({ method: 'get' })
      )
    })
  })

  describe('Non route specific behaviour', () => {
    test('forwards query string to upstream', async () => {
      mockUpstreamResponse({ body: { notifications: [] } })

      await server.inject({
        method: 'GET',
        url: '/internal/extapi/notifications?personId=123&organisationId=456'
      })

      expect(mockFetch).toHaveBeenCalledWith(
        `${INTERNAL_URL}/notifications?personId=123&organisationId=456`,
        expect.anything()
      )
    })

    test('forwards POST with body to upstream', async () => {
      mockUpstreamResponse({ body: { _data: [] } })

      await server.inject({
        method: 'POST',
        url: '/internal/extapi/person/search',
        headers: { 'content-type': 'application/json' },
        payload: { primarySearchPhrase: '1111111100', searchFieldType: 'CUSTOMER_REFERENCE' }
      })

      expect(mockFetch).toHaveBeenCalledWith(
        `${INTERNAL_URL}/person/search`,
        expect.objectContaining({ method: 'post' })
      )
    })

    test('forwards only allowed request headers upstream', async () => {
      mockUpstreamResponse()

      await server.inject({
        method: 'GET',
        url: '/internal/extapi/person/123/summary',
        headers: {
          email: 'email@example.com',
          'content-type': 'application/json',
          accept: 'application/json',
          'x-custom-header': 'should-be-filtered',
          connection: 'close',
          'transfer-encoding': 'chunked',
          host: 'original-host'
        }
      })

      const [, { headers }] = mockFetch.mock.calls[0]
      expect(headers['email']).toBe('email@example.com')
      expect(headers['content-type']).toBe('application/json')
      expect(headers['accept']).toBe('application/json')
      expect(headers['x-custom-header']).toBeUndefined()
      expect(headers['connection']).toBeUndefined()
      expect(headers['transfer-encoding']).toBeUndefined()
      expect(headers['host']).toBeUndefined()
    })

    test('forwards only allowed response headers to caller', async () => {
      mockUpstreamResponse({
        headers: {
          'cache-control': 'no-cache',
          'x-custom-header': 'should-be-filtered',
          'set-cookie': 'session=abc'
        }
      })

      const response = await server.inject({
        method: 'GET',
        url: '/internal/extapi/person/123/summary'
      })

      expect(response.headers['content-type']).toContain('application/json')
      expect(response.headers['cache-control']).toBe('no-cache')
      expect(response.headers['x-custom-header']).toBeUndefined()
      expect(response.headers['set-cookie']).toBeUndefined()
    })

    test('sets content-encoding: identity on all responses', async () => {
      mockUpstreamResponse()

      const response = await server.inject({
        method: 'GET',
        url: '/internal/extapi/person/123/summary'
      })

      expect(response.headers['content-encoding']).toBe('identity')
    })

    test('sets content-encoding: identity on error responses', async () => {
      mockUpstreamResponse({ status: 500 })

      const response = await server.inject({
        method: 'GET',
        url: '/internal/extapi/person/123/summary'
      })

      expect(response.headers['content-encoding']).toBe('identity')
    })

    test('returns upstream status code to caller', async () => {
      mockUpstreamResponse({ status: 404 })

      const response = await server.inject({
        method: 'GET',
        url: '/internal/extapi/person/99999/summary'
      })

      expect(response.statusCode).toBe(404)
    })

    test('returns upstream 5xx to caller', async () => {
      mockUpstreamResponse({ status: 503 })

      const response = await server.inject({
        method: 'GET',
        url: '/internal/extapi/organisation/123'
      })

      expect(response.statusCode).toBe(503)
    })

    test('forwards query string to upstream', async () => {
      mockUpstreamResponse()

      await server.inject({
        method: 'GET',
        url: '/external/extapi/notifications?personId=123&organisationId=456'
      })

      expect(mockFetch).toHaveBeenCalledWith(
        `${EXTERNAL_URL}/notifications?personId=123&organisationId=456`,
        expect.anything()
      )
    })

    test('returns upstream error codes to caller', async () => {
      mockUpstreamResponse({ status: 403 })

      const response = await server.inject({
        method: 'GET',
        url: '/external/extapi/person/123/summary'
      })

      expect(response.statusCode).toBe(403)
    })

    test('uses empty string for path when no path segment is provided', async () => {
      mockUpstreamResponse()

      await server.inject({ method: 'GET', url: '/internal/extapi' })

      expect(mockFetch).toHaveBeenCalledWith(`${INTERNAL_URL}/`, expect.anything())
    })
  })

  describe('mTLS configuration validation', () => {
    let router

    beforeAll(async () => {
      ;({ router } = await import('../../../../../src/routes/proxy/kits-proxy.router.js'))
    })

    beforeEach(() => {
      mockMTLSConfig = {
        internal: { cert: 'internal-cert', key: 'internal-key' },
        external: { cert: 'external-cert', key: 'external-key' }
      }
    })

    test('throws on registration when cert is missing', async () => {
      mockMTLSConfig.internal = { key: 'internal-key' }
      await expect(Hapi.server().register(router)).rejects.toThrow(
        'mTLS cert/key not configured for route /internal/extapi/{path*}'
      )
    })

    test('throws on registration when key is missing', async () => {
      mockMTLSConfig.internal = { cert: 'internal-cert' }
      await expect(Hapi.server().register(router)).rejects.toThrow(
        'mTLS cert/key not configured for route /internal/extapi/{path*}'
      )
    })

    test('includes ca in secure context when provided', async () => {
      const { default: tls } = await import('node:tls')
      tls.createSecureContext.mockClear()

      mockMTLSConfig.internal.ca = 'ca-cert'
      await Hapi.server().register(router)

      expect(tls.createSecureContext).toHaveBeenCalledWith(
        expect.objectContaining({ ca: 'ca-cert' })
      )
    })
  })
})
