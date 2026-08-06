import Hapi from '@hapi/hapi'
import inert from '@hapi/inert'
import { schemata } from '../../../src/plugins/schemata.js'

describe('Fake Person', () => {
  let server
  beforeAll(async () => {
    server = Hapi.server()
    await server.register([inert, schemata])
    await server.initialize()
  })
  ;['authenticate', 'person', 'organisation', 'siti-agri', 'permissions'].forEach((schema) => {
    it(`should fetch the ${schema} schema file`, async () => {
      const result = await server.inject({
        method: 'GET',
        url: `/schemata/${schema}.yml`
      })
      expect(result.statusCode).toBe(200)
    })
  })

  it('should return 404 for non-existent schema', async () => {
    const result = await server.inject({
      method: 'GET',
      url: '/schemata/nonexistent.yml'
    })
    expect(result.statusCode).toBe(404)
  })
})
