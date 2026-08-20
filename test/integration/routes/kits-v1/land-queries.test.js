import Hapi from '@hapi/hapi'
import { emulateUpstreamErrors } from '../../../../src/common/helpers/fail-action.js'
import { land } from '../../../../src/routes/kits-v1/land.js'
import { loadSchema } from '../../../../src/utils/validatePayload.js'

describe('Land routes', () => {
  let server, schema
  beforeAll(async () => {
    server = Hapi.server()
    server.route(land)
    server.ext('onPreResponse', emulateUpstreamErrors)
    await Promise.all([
      server.initialize(),
      loadSchema('/routes/kits-v1/land-schema.oas.yml').then((s) => (schema = s))
    ])
  })

  describe('for parcels by date', () => {
    test('should return static data when defined in id-lookups for the organisation', async () => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/lms/organisation/111111111/parcels/historic/01-Jan-25'
      })
      expect(statusCode).toBe(200)
      expect(result).toConformToSchema(
        schema.paths['/lms/organisation/{organisationId}/parcels/historic/{historicDate}'].get
          .responses[200].content['application/json'].schema
      )
      expect(result).toEqual(
        expect.arrayContaining([
          // check some of the static data is returned
          expect.objectContaining({ parcelId: '5662', sheetId: 'SS6627' }),
          expect.objectContaining({ parcelId: '3818', sheetId: 'SS6828' })
        ])
      )
      expect(result.length).toEqual(2)
    })

    test('should return faked data when NOT defined in id-lookups for the organisation', async () => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/lms/organisation/222222222/parcels/historic/01-Jan-25'
      })
      expect(statusCode).toBe(200)
      expect(result).toConformToSchema(
        schema.paths['/lms/organisation/{organisationId}/parcels/historic/{historicDate}'].get
          .responses[200].content['application/json'].schema
      )
      expect(result.length).toBeGreaterThan(0)
    })

    test('should return 403 if organisationId is not numeric', async () => {
      const { statusCode } = await server.inject({
        method: 'GET',
        url: '/lms/organisation/nonexistent/parcels/historic/01-Jan-25'
      })
      expect(statusCode).toBe(403)
    })

    test('should return 404 if organisationId overflows a Java Long', async () => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/lms/organisation/9223372036854775808/parcels/historic/01-Jan-25'
      })
      expect(statusCode).toBe(404)
      expect(result).toEqual({ code: 404, message: 'HTTP 404 Not Found' })
    })

    test('should return 403 if supplied historicDate is badly formed', async () => {
      const { statusCode } = await server.inject({
        method: 'GET',
        url: '/lms/organisation/111111111/parcels/historic/invalid'
      })
      expect(statusCode).toBe(403)
    })

    test.each([['00-AAA-00'], ['00-jul-24'], ['99-Jul-24']])(
      'should return 500 if historicDate matches the pattern but cannot be parsed (%s)',
      async (historicDate) => {
        const { result, statusCode } = await server.inject({
          method: 'GET',
          url: `/lms/organisation/111111111/parcels/historic/${historicDate}`
        })
        expect(statusCode).toBe(500)
        expect(result).toEqual({
          code: 500,
          message: expect.stringMatching(
            /^There was an error processing your request\. It has been logged \(ID [0-9a-f]{16}\)\.$/
          )
        })
      }
    )

    test('should not return data where land is defined AND empty in id-lookups for the organisation', async () => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/lms/organisation/100000000/parcels/historic/01-Jan-25'
      })
      expect(statusCode).toBe(200)
      expect(result).toEqual([])
    })
  })

  describe('for parcel details by date', () => {
    test('should return data for valid request', async () => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/lms/organisation/111111111/parcel-details/historic/01-Jan-25'
      })
      expect(statusCode).toBe(200)
      expect(result).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ parcelId: '5662', sheetId: 'SS6627' }),
          expect.objectContaining({ parcelId: '3818', sheetId: 'SS6828' })
        ])
      )
    })

    test('should return 403 if organisationId is not numeric', async () => {
      const { statusCode } = await server.inject({
        method: 'GET',
        url: '/lms/organisation/nonexistent/parcel-details/historic/01-Jan-25'
      })
      expect(statusCode).toBe(403)
    })

    test('should return 403 if historicDate is invalid', async () => {
      const { statusCode } = await server.inject({
        method: 'GET',
        url: '/lms/organisation/111111111/parcel-details/historic/invalid'
      })
      expect(statusCode).toBe(403)
    })
  })

  describe('for land covers of sheet & parcel by date', () => {
    test('should return data with geometries omitted by default', async () => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/lms/organisation/111111111/parcel/sheet-id/SS6627/parcel-id/5662/historic/01-Mar-25/land-covers'
      })
      expect(statusCode).toBe(200)
      expect(result).toEqual({
        type: 'FeatureCollection',
        features: expect.arrayContaining([
          {
            id: 11769295,
            properties: {
              area: '10270.38',
              code: '110',
              name: 'Arable Land',
              isBpsEligible: 'true'
            },
            type: 'Feature',
            geometry: null
          }
        ])
      })
    })

    test('should return data with geometries included when requested', async () => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/lms/organisation/111111111/parcel/sheet-id/SS6627/parcel-id/5662/historic/01-Mar-25/land-covers?includeGeometries=true'
      })
      expect(statusCode).toBe(200)
      expect(result).toEqual({
        type: 'FeatureCollection',
        features: expect.arrayContaining([
          {
            id: 11769295,
            properties: {
              area: '10270.38',
              code: '110',
              name: 'Arable Land',
              isBpsEligible: 'true'
            },
            type: 'Feature',
            geometry: {
              type: 'Polygon',
              coordinates: [
                expect.arrayContaining([
                  [267996.4077, 128598.2581],
                  [267996.918, 128598.085],
                  [268028.15, 128535.31],
                  [268031.3375, 128528.8885],
                  [268039.0495, 128513.3517]
                ])
              ]
            }
          }
        ])
      })
    })

    test('should return 403 if organisationId is not numeric', async () => {
      const { statusCode } = await server.inject({
        method: 'GET',
        url: '/lms/organisation/nonexistent/parcel/sheet-id/SS6627/parcel-id/5662/historic/01-Mar-25/land-covers'
      })
      expect(statusCode).toBe(403)
    })

    test('should return 200 even if organisationId overflows a Java Long (upstream never parses it)', async () => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/lms/organisation/9223372036854775808/parcel/sheet-id/SS6627/parcel-id/5662/historic/01-Mar-25/land-covers'
      })
      expect(statusCode).toBe(200)
      expect(result.type).toBe('FeatureCollection')
    })

    test('should return 403 if historicDate is badly formed', async () => {
      const { statusCode } = await server.inject({
        method: 'GET',
        url: '/lms/organisation/111111111/parcel/sheet-id/SS6627/parcel-id/5662/historic/invalid/land-covers'
      })
      expect(statusCode).toBe(403)
    })

    test('should return 500 if historicDate matches the pattern but cannot be parsed', async () => {
      const { statusCode } = await server.inject({
        method: 'GET',
        url: '/lms/organisation/111111111/parcel/sheet-id/SS6627/parcel-id/5662/historic/00-AAA-00/land-covers'
      })
      expect(statusCode).toBe(500)
    })

    test('should treat includeGeometries=null as false', async () => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/lms/organisation/111111111/parcel/sheet-id/SS6627/parcel-id/5662/historic/01-Mar-25/land-covers?includeGeometries=null'
      })
      expect(statusCode).toBe(200)
      expect(result.features[0].geometry).toBeNull()
    })

    test('should treat any unrecognised includeGeometries value as false', async () => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/lms/organisation/111111111/parcel/sheet-id/SS6627/parcel-id/5662/historic/01-Mar-25/land-covers?includeGeometries=foo'
      })
      expect(statusCode).toBe(200)
      expect(result.features[0].geometry).toBeNull()
    })
  })

  describe('for covers summary by date', () => {
    test('should return data', async () => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/lms/organisation/111111111/covers-summary/historic/01-Jan-25'
      })
      expect(statusCode).toBe(200)
      expect(result).toEqual([
        {
          code: '110',
          name: 'Arable Land',
          area: 10270.38
        },
        {
          code: '130',
          name: 'Permanent Grassland',
          area: 0
        },
        {
          code: '140',
          name: 'Permanent Crops',
          area: 0
        }
      ])
    })

    test('should throw error if org does not exist', async () => {
      const { statusCode } = await server.inject({
        method: 'GET',
        url: '/lms/organisation/999999999/covers-summary/historic/01-Jan-25'
      })
      expect(statusCode).toBe(500)
    })

    test('should return 403 if organisationId is not numeric', async () => {
      const { statusCode } = await server.inject({
        method: 'GET',
        url: '/lms/organisation/nonexistent/covers-summary/historic/01-Jan-25'
      })
      expect(statusCode).toBe(403)
    })

    test('should return 403 if historicDate is invalid', async () => {
      const { statusCode } = await server.inject({
        method: 'GET',
        url: '/lms/organisation/111111111/covers-summary/historic/invalid'
      })
      expect(statusCode).toBe(403)
    })
  })

  describe('for geometries by bounding box', () => {
    test('should return data', async () => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/lms/organisation/111111111/geometries?bbox=0,0,0,0'
      })
      expect(statusCode).toBe(200)
      expect(result).toEqual({
        features: expect.arrayContaining([
          expect.objectContaining({
            id: 7386091,
            type: 'Feature',
            properties: {
              sheetId: 'SS6627',
              parcelId: '5662',
              area: '10270.39',
              pendingDigitisation: 'false'
            },
            geometry: expect.objectContaining({ type: 'Polygon' })
          })
        ])
      })
    })

    test.each([['nonexistent'], ['0.0'], ['1e5'], ['0x10'], ['-5'], ['99999999999999999999']])(
      'should return 403 if organisationId is not 1-19 digits (%s)',
      async (organisationId) => {
        const { statusCode } = await server.inject({
          method: 'GET',
          url: `/lms/organisation/${organisationId}/geometries?bbox=0,0,0,0`
        })
        expect(statusCode).toBe(403)
      }
    )

    test('should return 404 if organisationId overflows a Java Long', async () => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: '/lms/organisation/9223372036854775808/geometries?bbox=0,0,0,0'
      })
      expect(statusCode).toBe(404)
      expect(result).toEqual({ code: 404, message: 'HTTP 404 Not Found' })
    })

    test('should return 400 if bounding box is missing', async () => {
      const { statusCode } = await server.inject({
        method: 'GET',
        url: '/lms/organisation/111111111/geometries'
      })
      expect(statusCode).toBe(400)
    })

    test('should return 400 if bounding box is empty', async () => {
      const { statusCode } = await server.inject({
        method: 'GET',
        url: '/lms/organisation/111111111/geometries?bbox='
      })
      expect(statusCode).toBe(400)
    })

    test.each([
      ['too few coordinates', '1,1,1'],
      ['too many coordinates', '1,1,1,1,1'],
      ['non-numeric coordinates', 'a,b,c,d']
    ])('should return 404 if bounding box has %s (%s)', async (_description, bbox) => {
      const { statusCode } = await server.inject({
        method: 'GET',
        url: `/lms/organisation/111111111/geometries?bbox=${bbox}`
      })
      expect(statusCode).toBe(404)
    })

    test('should return data if bounding box contains signed/leading-zero coordinates', async () => {
      const { statusCode } = await server.inject({
        method: 'GET',
        url: '/lms/organisation/111111111/geometries?bbox=-1.5,%2B2.0,1,00.1'
      })
      expect(statusCode).toBe(200)
    })
  })
})
