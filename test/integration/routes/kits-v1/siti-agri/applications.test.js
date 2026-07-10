import Hapi from '@hapi/hapi'
import { sitiagri } from '../../../../../src/routes/kits-v1/siti-agri.js'
import { loadSchema } from '../../../../../src/utils/validatePayload.js'

describe('Fake Authenticate data', () => {
  let server, schema
  beforeAll(async () => {
    server = Hapi.server()
    server.route(sitiagri)
    await Promise.all([
      server.initialize(),
      loadSchema('/routes/kits-v1/siti-agri-schema.oas.yml').then((s) => (schema = s))
    ])
  })

  it('should GET fake applications data conforming to the schema', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/SitiAgriApi/cv/appByBusiness/sbi/222222222/list'
    })
    expect(statusCode).toBe(200)
    expect(result).toConformToSchema(
      schema.paths['/SitiAgriApi/cv/appByBusiness/sbi/{sbi}/list'].get.responses['200'].content[
        'application/json'
      ].schema
    )
  })

  it('should GET applications data with overrides defined in the id-lookups', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/SitiAgriApi/cv/appByBusiness/sbi/107183280/list'
    })
    expect(statusCode).toBe(200)
    expect(result).toConformToSchema(
      schema.paths['/SitiAgriApi/cv/appByBusiness/sbi/{sbi}/list'].get.responses['200'].content[
        'application/json'
      ].schema
    )
    expect(result.data.length).toBe(1)

    const app = result.data[0]
    expect(app.application_history.length).toBe(1)
    const history = app.application_history[0]
    expect(history.transition_name).toBe(app.transition_name)
    expect(history.transition_id).toBe(app.transition_id)
  })
})
