import Hapi from '@hapi/hapi'
import { retrieveOrganisationAgreements } from '../../../../../src/factories/siti-agri/agreement.factory.js'
import { sitiagri } from '../../../../../src/routes/kits-v1/siti-agri.js'
import { loadSchema } from '../../../../../src/utils/validatePayload.js'

describe('Basic queries for faked routes', () => {
  let server, schema
  beforeAll(async () => {
    server = Hapi.server()
    server.route(sitiagri)
    await Promise.all([
      server.initialize(),
      loadSchema('routes/kits-v1/siti-agri-schema.oas.yml').then((s) => (schema = s))
    ])
  })

  describe('SitiAgri route', () => {
    it('Should return data for /SitiAgriApi/cv/agreementsByBusiness/sbi/111111111/list', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/SitiAgriApi/cv/agreementsByBusiness/sbi/111111111/list`
      })

      expect(response.statusCode).toBe(200)
      const json = JSON.parse(response.payload)

      const agreements = retrieveOrganisationAgreements(111111111)
      expect(json.data).toEqual(agreements)
    })
    it('Should return random data for SBI without defined agreements in config', async () => {
      const response = await server.inject({
        method: 'GET',
        url: `/SitiAgriApi/cv/agreementsByBusiness/sbi/107167406/list`
      })

      expect(response.statusCode).toBe(200)
      const json = JSON.parse(response.payload)

      const agreements = retrieveOrganisationAgreements(107167406)
      expect(json.data).toEqual(agreements)
    })

    it('should GET a agreements conforming to the schema', async () => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/SitiAgriApi/cv/agreementsByBusiness/sbi/111111111/list'
      })
      expect(statusCode).toBe(200)
      expect(result).toConformToSchema(
        schema.paths['/SitiAgriApi/cv/agreementsByBusiness/sbi/{sbi}/list'].get.responses['200']
          .content['application/json'].schema
      )
    })
  })
})
