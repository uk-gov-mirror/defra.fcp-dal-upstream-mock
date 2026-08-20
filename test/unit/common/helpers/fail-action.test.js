import Boom from '@hapi/boom'
import { emulateUpstreamErrors, failAction } from '../../../../src/common/helpers/fail-action.js'

describe('#fail-action', () => {
  test('Should throw expected error', () => {
    const mockRequest = {}
    const mockToolkit = {}
    const mockError = Error('Something terrible has happened!')

    expect(() => failAction(mockRequest, mockToolkit, mockError)).toThrow(
      'Something terrible has happened!'
    )
  })
})

describe('#emulateUpstreamErrors', () => {
  const mockToolkit = {
    response: (payload) => ({ code: (statusCode) => ({ payload, statusCode }) }),
    continue: Symbol('continue')
  }
  const mockRequest = (response) => ({
    headers: {},
    info: { id: 'test-id' },
    method: 'get',
    path: '/test',
    payload: null,
    response
  })

  test('Should pass non-Boom responses through', () => {
    const result = emulateUpstreamErrors(mockRequest({ isBoom: false }), mockToolkit)
    expect(result).toBe(mockToolkit.continue)
  })

  test('Should replace a 404 with the upstream JAX-RS envelope', () => {
    const { payload, statusCode } = emulateUpstreamErrors(mockRequest(Boom.notFound()), mockToolkit)
    expect(statusCode).toBe(404)
    expect(payload).toEqual({ code: 404, message: 'HTTP 404 Not Found' })
  })

  test('Should replace a 403 with the upstream WAF HTML page', () => {
    const { payload, statusCode } = emulateUpstreamErrors(
      mockRequest(Boom.forbidden()),
      mockToolkit
    )
    expect(statusCode).toBe(403)
    expect(payload).toContain('<h1>403 Forbidden</h1>')
  })

  test('Should replace a 500 with the upstream logged-error envelope', () => {
    const { payload, statusCode } = emulateUpstreamErrors(mockRequest(Boom.internal()), mockToolkit)
    expect(statusCode).toBe(500)
    expect(payload).toEqual({
      code: 500,
      message: expect.stringMatching(
        /^There was an error processing your request\. It has been logged \(ID [0-9a-f]{16}\)\.$/
      )
    })
  })
})
