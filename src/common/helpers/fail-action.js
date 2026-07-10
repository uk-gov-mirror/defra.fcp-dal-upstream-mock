import { createLogger } from './logging/logger.js'

const logger = createLogger()

export function failAction(_request, _h, error) {
  logger.warn(error, error?.message)
  throw error
}

export const emulateUpstreamErrors = (request, h) => {
  const { headers, info, method, path, payload, response } = request

  if (response.isBoom) {
    const code = response.output.statusCode
    logger.warn({
      http: {
        request: {
          id: info.id,
          method,
          ...(headers && { headers })
        },
        response: {
          status_code: code,
          ...(info?.received && { response_time: Date.now() - info.received })
        }
      },
      error: {
        code,
        type: response.name,
        message: response.message,
        stack_trace: response.stack
      },
      message: `${method}${payload ? ' ' + JSON.stringify(payload) : ''} ${path} ${code}`
    })

    // Replace payload for client with standard upstream error responses
    if (code === 400) {
      return h.response({ code, message: 'HTTP 400 Bad Request' }).code(code)
      // TODO: decide when put endpoints should respond with:
      //   `{"code":400,"message":"Unable to process JSON"}`
      //   `"source cannot be null"`
    }
    if (code === 403) {
      return h
        .response(
          '<html><body><h1>403 Forbidden</h1>\n' +
            'Request forbidden by administrative rules.\n</body></html>\n'
        )
        .code(code)
    }
    if (code === 404) {
      return h.response({ code, message: 'HTTP 404 Not Found' }).code(code)
    }
    if (code === 422) {
      return h.response({ code, message: 'HTTP 422 ' }).code(code)
    }
    if (code === 500) {
      return h
        .response({
          code,
          message: 'There was an error processing your request. It has been logged (ID someID)'
        })
        .code(code)
    }
    return h.response({ code, message: response.message }).code(code)
  }

  return h.continue
}
