import Hapi from '@hapi/hapi'
import { sitiagri } from '../../../../../src/routes/kits-v1/siti-agri.js'
import { loadSchema } from '../../../../../src/utils/validatePayload.js'

describe('Fake CPH data', () => {
  let server, schema
  beforeAll(async () => {
    server = Hapi.server()
    server.route(sitiagri)
    await Promise.all([
      server.initialize(),
      loadSchema('/routes/kits-v1/siti-agri-schema.oas.yml').then(
        (s) =>
          (schema =
            s.paths['/SitiAgriApi/cv/cphByBusiness/sbi/{sbi}/list'].get.responses['200'].content[
              'application/json'
            ].schema)
      )
    ])
  })

  it('should GET fake CPH data conforming to the schema', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/SitiAgriApi/cv/cphByBusiness/sbi/222222222/list'
    })
    expect(statusCode).toBe(200)
    expect(result).toConformToSchema(schema)
    expect(result.data.every((cph) => cph.sbi === '222222222')).toBe(true)
  })

  it('should GET CPH data with overrides defined in the id-lookups', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/SitiAgriApi/cv/cphByBusiness/sbi/107183280/list'
    })
    expect(statusCode).toBe(200)
    expect(result).toConformToSchema(schema)
    expect(result.data.length).toBe(8)
    expect(result.data.every((cph) => cph.sbi === '107183280')).toBe(true)
  })
})
