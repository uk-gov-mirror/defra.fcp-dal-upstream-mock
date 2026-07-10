import hapi from '@hapi/hapi'

const mockHapiLoggerInfo = vi.fn()
const mockHapiLoggerError = vi.fn()

vi.mock('hapi-pino', async (importOriginal) => {
  const actual = await importOriginal()
  const mockedPlugin = {
    register: (server) => {
      server.decorate('server', 'logger', {
        info: mockHapiLoggerInfo,
        error: mockHapiLoggerError
      })
    },
    name: 'mock-hapi-pino'
  }

  return {
    ...actual,
    __esModule: true,
    default: mockedPlugin,
    ...mockedPlugin
  }
})

describe('#startServer', () => {
  const PROCESS_ENV = process.env
  let hapiServerSpy = vi.fn()
  let startServerImport

  beforeAll(async () => {
    process.env = { ...PROCESS_ENV }
    process.env.PORT = '3098' // Set to obscure port to avoid conflicts

    startServerImport = await import('../../src/server.js')
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  afterAll(() => {
    process.env = PROCESS_ENV
  })

  describe('When server starts', () => {
    let server

    afterAll(async () => {
      if (server) await server.stop({ timeout: 0 })
    })

    test('Should start up server on specified port', async () => {
      hapiServerSpy = vi.spyOn(hapi, 'server')
      server = await startServerImport.startServer()

      expect(hapiServerSpy).toHaveBeenCalledWith(expect.objectContaining({ port: 3098 }))
      expect(mockHapiLoggerInfo).toHaveBeenNthCalledWith(1, 'Server started successfully')
      expect(mockHapiLoggerInfo).toHaveBeenNthCalledWith(2, 'Access mock on http://localhost:3098')
    })
  })

  describe('When server start fails', () => {
    test('Should attempt to stop (teardown) the server', async () => {
      const register = vi.fn()
      const ext = vi.fn()
      const start = vi.fn(() => {
        throw new Error('Server failed to start')
      })
      const stop = vi.fn()
      const serverSpy = vi.spyOn(hapi, 'server').mockReturnValue({ register, ext, start, stop })

      await startServerImport.startServer()

      expect(serverSpy).toHaveBeenCalled()
      expect(register).toHaveBeenCalled()
      expect(ext).toHaveBeenCalled()
      expect(start).toHaveBeenCalled()
      expect(stop).toHaveBeenCalledWith({ timeout: 0 })
    })
  })
})
