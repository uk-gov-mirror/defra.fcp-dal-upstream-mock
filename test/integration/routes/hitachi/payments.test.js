import Hapi from '@hapi/hapi'
import { retrievePayments } from '../../../../src/factories/payments.factory.js'
import { payments } from '../../../../src/routes/hitachi/payments.js'
import { loadSchema } from '../../../../src/utils/validatePayload.js'

describe('Fake Payments', () => {
  let server, schema
  beforeAll(async () => {
    server = Hapi.server()
    server.route(payments)
    await Promise.all([
      server.initialize(),
      loadSchema('/routes/hitachi/payments-schema.oas.yml').then((s) => (schema = s))
    ])
  })

  describe('factory', () => {
    it('should generate payments array matching the schema', () => {
      const { PaymentsData } = schema.components.schemas
      const paymentsResponse = retrievePayments('2222222222')
      expect({
        ...paymentsResponse,
        // add dummy values for fields calculated JIT in the route
        parmSupplierInfo: { ...paymentsResponse.parmSupplierInfo, parmSupplier: 'business name' },
        InfoMessages: ['added later']
      }).toConformToSchema(PaymentsData)
    })
  })

  describe('route', () => {
    const url =
      '/services/RSFVendPaymentDetailsServiceGroup/' +
      'RSFVendPaymentDetailsService/getSupplierPaymentsPackage'
    const headers = { authorization: 'bearer token' } // dummy token for mock auth

    it('should POST payments response conforming to the schema', async () => {
      const { result, statusCode } = await server.inject({
        method: 'POST',
        url,
        headers,
        payload: {
          request: {
            payment: { SupplierAccount: '2222222222' },
            audit: {}
          }
        }
      })
      expect(statusCode).toBe(200)
      expect(result).toConformToSchema(schema.components.schemas.PaymentsData)
      expect(result.parmPayments.length).toEqual(42)
      expect(result.InfoMessages).toEqual(['No. of payments retrieved = 42'])
    })

    it('should filter payments by FromDate', async () => {
      const { result, statusCode } = await server.inject({
        method: 'POST',
        url,
        headers,
        payload: {
          request: {
            payment: {
              SupplierAccount: '2222222222',
              FromDate: new Date().toISOString() // filter out all dates
            },
            audit: {}
          }
        }
      })
      expect(statusCode).toBe(200)
      expect(result.parmPayments).toEqual([])
      expect(result.InfoMessages).toEqual(['No. of payments retrieved = 0'])
    })

    it('should filter payments by FromDate', async () => {
      const { result, statusCode } = await server.inject({
        method: 'POST',
        url,
        headers,
        payload: {
          request: {
            payment: {
              SupplierAccount: '2222222222',
              // filter out all dates (as payments are more recent)
              ToDate: new Date('2000-01-01').toISOString()
            },
            audit: {}
          }
        }
      })
      expect(statusCode).toBe(200)
      expect(result.parmPayments).toEqual([])
      expect(result.InfoMessages).toEqual(['No. of payments retrieved = 0'])
    })

    it('should filter payments by FromDate', async () => {
      const { result, statusCode } = await server.inject({
        method: 'POST',
        url,
        headers,
        payload: {
          request: {
            payment: {
              SupplierAccount: '2222222222',
              // include all dates (as payments are recent but not made in the future)
              FromDate: new Date('2000-01-01').toISOString(),
              ToDate: new Date().toISOString()
            },
            audit: {}
          }
        }
      })
      expect(statusCode).toBe(200)
      expect(result.parmPayments.length).toEqual(42)
      expect(result.InfoMessages).toEqual(['No. of payments retrieved = 42'])
    })

    it('honours static data if set', async () => {
      const { result, statusCode } = await server.inject({
        method: 'POST',
        url,
        headers,
        payload: {
          request: {
            payment: { SupplierAccount: '9622158989' },
            audit: {}
          }
        }
      })
      expect(statusCode).toBe(200)
      expect(result).toEqual({
        Result: true,
        parmSupplierInfo: {
          parmHoldCodes: ['NTHLD'],
          parmAccountLast4: '****3632',
          parmSortCode: '512852',
          parmSupplier: 'Frami, Treutel and Volkman'
        },
        parmPayments: [], // empty payments array set in `id-lookups.js`
        InfoMessages: ['No. of payments retrieved = 0']
      })
    })
  })
})
