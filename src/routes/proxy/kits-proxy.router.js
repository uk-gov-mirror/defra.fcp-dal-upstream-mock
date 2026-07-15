import tls from 'node:tls'
import { EnvHttpProxyAgent, fetch as fetch11 } from 'undici'
import { createLogger } from '../../common/helpers/logging/logger.js'
import { config } from '../../config.js'

const logger = createLogger()

// `email` authenticates internal-gateway calls; `authorization` + `crn` authenticate
// external-gateway calls
const ALLOWED_REQUEST_HEADERS = new Set(['email', 'authorization', 'crn', 'content-type', 'accept'])
const ALLOWED_RESPONSE_HEADERS = new Set(['content-type'])

const extractRequestHeaders = (headers) =>
  Object.fromEntries(
    Object.entries(headers).filter(([key]) => ALLOWED_REQUEST_HEADERS.has(key.toLowerCase()))
  )

const extractResponseHeaders = (headers) =>
  Object.fromEntries(
    Object.entries(headers).filter(([key]) => ALLOWED_RESPONSE_HEADERS.has(key.toLowerCase()))
  )

const mtlsDispatcher = (mtlsConfig, baseUrl) => {
  const { hostname } = new URL(baseUrl)
  const connectOptions = {
    cert: mtlsConfig.cert,
    key: mtlsConfig.key,
    ...(mtlsConfig.ca && { ca: mtlsConfig.ca }),
    servername: hostname
  }

  // EnvHttpProxyAgent handles two distinct connection paths:
  // - Deployed (CDP) environments route traffic through a SQUID proxy, so traffic is routed
  //   via a CONNECT tunnel. undici applies `requestTls` to the inner TLS connection inside that tunnel.
  // - Local Docker has no proxy, so undici makes a direct TLS connection and applies `connect` instead.
  //   Without `connect`, the self-signed CA is not trusted and the handshake fails with SELF_SIGNED_CERT_IN_CHAIN.
  return new EnvHttpProxyAgent({
    connect: connectOptions,
    requestTls: { servername: hostname, secureContext: tls.createSecureContext(connectOptions) }
  })
}

const proxyRoute = (routePath, baseUrl, mtlsConfig) => {
  if (!mtlsConfig.cert || !mtlsConfig.key) {
    throw new Error(`mTLS cert/key not configured for route ${routePath}`)
  }
  const dispatcher = mtlsDispatcher(mtlsConfig, baseUrl)

  return {
    method: '*',
    path: routePath,
    options: {
      auth: false,
      payload: { output: 'data', parse: false }
    },
    handler: async (request, h) => {
      const forwardedPath = request.params.path ?? ''
      const targetUrl = `${baseUrl}/${forwardedPath}${request.url.search}`

      logger.debug(`Proxying ${request.method.toUpperCase()} ${targetUrl}`)
      try {
        const upstreamResponse = await fetch11(targetUrl, {
          method: request.method,
          headers: extractRequestHeaders(request.headers),
          body: request.payload ?? undefined,
          dispatcher,
          signal: AbortSignal.timeout(config.get('kitsProxy.gatewayTimeoutMs'))
        })
        const responseBody = await upstreamResponse.arrayBuffer()
        const responseHeaders = extractResponseHeaders(
          Object.fromEntries(upstreamResponse.headers.entries())
        )
        const response = h.response(Buffer.from(responseBody)).code(upstreamResponse.status)
        for (const [name, value] of Object.entries(responseHeaders)) {
          response.header(name, value)
        }

        // Any content encoding applied by the upstream is lost when we create an ArrayBuffer from the
        // upstream response body, so using the upstream's content-encoding would be incorrect here.
        // Make it clear to any downstream caller that the body is not encoded
        response.header('content-encoding', 'identity')
        return response
      } catch (error) {
        logger.error(JSON.stringify(error))
        throw error
      }
    }
  }
}

export const router = {
  plugin: {
    name: 'kits-proxy-router',
    register: (server, _) => {
      server.route([
        proxyRoute(
          '/internal/extapi/{path*}',
          config.get('kitsProxy.internal.gatewayUrl'),
          config.decodedKitsMTLS.internal
        ),
        proxyRoute(
          '/external/extapi/{path*}',
          config.get('kitsProxy.external.gatewayUrl'),
          config.decodedKitsMTLS.external
        )
      ])
    }
  }
}
