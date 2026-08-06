import Hapi from '@hapi/hapi'
import { retrieveAuthorisationByFunction } from '../../../../../src/factories/siti-agri/permissions.factory.js'
import { permissions } from '../../../../../src/routes/kits-v1/permissions.js'
import { loadSchema } from '../../../../../src/utils/validatePayload.js'

const schemaPath = '/SitiAgriApi/authorisation/organisation/{orgId}/byFunction'

describe('Permissions (authorisation byFunction) route', () => {
  let server, schema
  beforeAll(async () => {
    server = Hapi.server()
    server.route(permissions)
    await Promise.all([
      server.initialize(),
      loadSchema('routes/kits-v1/permissions-schema.oas.yml').then((s) => (schema = s))
    ])
  })

  const orgId = 5583781
  const query =
    'functions=viewLand|amendBusinessDetails|viewEntitlements&module=CUST_SS_PORTAL&timestamp=1720000000000'

  it('returns the requested functions mapped to booleans, wrapped in the standard envelope', async () => {
    const response = await server.inject({
      method: 'GET',
      url: `/SitiAgriApi/authorisation/organisation/${orgId}/byFunction?${query}`
    })

    expect(response.statusCode).toBe(200)
    const json = JSON.parse(response.payload)

    expect(json.success).toBe(true)
    expect(json.errorString).toBeNull()
    expect(json.data).toEqual(
      retrieveAuthorisationByFunction(orgId, [
        'viewLand',
        'amendBusinessDetails',
        'viewEntitlements'
      ])
    )
  })

  it('conforms to the response schema', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: `/SitiAgriApi/authorisation/organisation/${orgId}/byFunction?${query}`
    })

    expect(statusCode).toBe(200)
    expect(result).toConformToSchema(
      schema.paths[schemaPath].get.responses['200'].content['application/json'].schema
    )
  })

  it('returns 403 for a non-integer orgId, like the upstream', async () => {
    const response = await server.inject({
      method: 'GET',
      url: `/SitiAgriApi/authorisation/organisation/not-an-id/byFunction?${query}`
    })

    expect(response.statusCode).toBe(403)
  })

  it('returns the error envelope as a 500 when functions is missing, like the upstream', async () => {
    const response = await server.inject({
      method: 'GET',
      url: `/SitiAgriApi/authorisation/organisation/${orgId}/byFunction?module=CUST_SS_PORTAL&timestamp=1720000000000`
    })

    expect(response.statusCode).toBe(500)
    expect(JSON.parse(response.payload)).toEqual({
      data: null,
      success: false,
      errorString: 'An error has occurred.'
    })
  })

  it('returns the error envelope as a 500 when module is missing, like the upstream', async () => {
    const response = await server.inject({
      method: 'GET',
      url: `/SitiAgriApi/authorisation/organisation/${orgId}/byFunction?functions=viewLand&timestamp=1720000000000`
    })

    expect(response.statusCode).toBe(500)
    expect(JSON.parse(response.payload)).toEqual({
      data: null,
      success: false,
      errorString: 'An error has occurred.'
    })
  })

  it('returns false for every function when the module is unrecognised, like the upstream', async () => {
    const response = await server.inject({
      method: 'GET',
      url: `/SitiAgriApi/authorisation/organisation/${orgId}/byFunction?functions=viewLand|viewCPH&module=NOPE&timestamp=1720000000000`
    })

    expect(response.statusCode).toBe(200)
    expect(JSON.parse(response.payload).data).toEqual({ viewLand: false, viewCPH: false })
  })

  it('matches the module case-insensitively, like the upstream', async () => {
    const [upper, lower] = await Promise.all(
      ['CUST_SS_PORTAL', 'cust_ss_portal'].map((module) =>
        server.inject({
          method: 'GET',
          url: `/SitiAgriApi/authorisation/organisation/${orgId}/byFunction?functions=viewLand&module=${module}`
        })
      )
    )

    expect(lower.statusCode).toBe(200)
    expect(JSON.parse(lower.payload)).toEqual(JSON.parse(upper.payload))
  })

  it('echoes an empty functions list back as a single empty-named flag, like the upstream', async () => {
    const response = await server.inject({
      method: 'GET',
      url: `/SitiAgriApi/authorisation/organisation/${orgId}/byFunction?functions=&module=CUST_SS_PORTAL&timestamp=1720000000000`
    })

    expect(response.statusCode).toBe(200)
    expect(JSON.parse(response.payload).data).toEqual({ '': false })
  })
})
