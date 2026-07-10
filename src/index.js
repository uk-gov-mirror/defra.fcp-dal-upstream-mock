import { createServer as createHttpServer } from 'node:http'
import { createServer as createHttpsServer } from 'node:https'
import process from 'node:process'
import { createLogger } from './common/helpers/logging/logger.js'
import { config } from './config.js'
import { startServer } from './server.js'

const logger = createLogger()

export const createListener = () => {
  // If TLS key/cert provided, create HTTPS server and enable mTLS (request client cert)
  const server = config.decodedTLS
    ? (() => {
        const options = config.decodedTLS || {}
        const requireClient = config.get('tls.requireClientCert')
        options.requestCert = !!requireClient
        options.rejectUnauthorized = !!requireClient
        return createHttpsServer(options)
      })()
    : createHttpServer()

  server.on('clientError', (err, socket) => {
    logger.warn('Client error on HTTP server', err)

    // Override default handling of invalid characters in header to match upstream behaviour
    if ((err.code = 'HPE_INVALID_HEADER_TOKEN')) {
      const body =
        '<html><body><h1>400 Bad request</h1>Your browser sent an invalid request.</body></html>'

      const response = [
        'HTTP/1.1 400 Bad Request',
        'Content-Type: text/html',
        'Content-Length: ' + Buffer.byteLength(body),
        'Connection: close',
        'Cache-Control: no-cache',
        '',
        body
      ].join('\r\n')

      if (socket.writable) {
        socket.write(response)
        socket.destroy()
      } else {
        logger.info('Socket is not writable, skipping response')
        socket.destroy()
      }
    }
  })

  return server
}

let hapi
// do not add the process listeners when running tests
if (process.env.NODE_ENV !== 'test') {
  const server = createListener()
  hapi = await startServer(server)

  process.on('unhandledRejection', async (error) => {
    logger.info('Unhandled rejection')
    logger.error(error)
    process.exitCode = 1
    await hapi.stop()
  })
  process.on('uncaughtException', async (error) => {
    logger.info('Unhandled exception')
    logger.error(error)
    process.exitCode = 1
    await hapi.stop()
  })

  process.on('SIGINT', async () => {
    logger.info('SIGINT: closing server...')
    logger.flush()
  })
  process.on('SIGTERM', async () => {
    logger.info('SIGTERM: closing server...')
    logger.flush()
  })
}
export { hapi }
