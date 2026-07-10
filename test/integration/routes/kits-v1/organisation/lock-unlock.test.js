import Hapi from '@hapi/hapi'
import { organisation } from '../../../../../src/routes/kits-v1/organisation.js'

describe('Organisation Lock/Unlock', () => {
  let server
  beforeAll(async () => {
    server = Hapi.server()
    server.route(organisation)
    await server.initialize()
  })

  describe('Lock', () => {
    it('should lock an organisation successfully', async () => {
      const organisationId = 100000000
      const { statusCode } = await server.inject({
        method: 'POST',
        url: `/organisation/${organisationId}/lock`,
        payload: {
          partyNoteType: 'LockOrganisation',
          reason: 'Business Structure Changes'
        }
      })
      expect(statusCode).toBe(204)
    })

    it('should return server error when organisation does not exist', async () => {
      const organisationId = 999999999
      const { statusCode } = await server.inject({
        method: 'POST',
        url: `/organisation/${organisationId}/lock`,
        payload: {
          partyNoteType: 'LockOrganisation',
          reason: 'Business Structure Changes'
        }
      })
      expect(statusCode).toBe(500)
    })

    it('should return bad request when payload is invalid', async () => {
      const organisationId = 100000000
      const { statusCode } = await server.inject({
        method: 'POST',
        url: `/organisation/${organisationId}/lock`,
        payload: {
          partyNoteType: 'LockOrganisation',
          reason: {}
        }
      })
      expect(statusCode).toBe(400)
    })
  })

  describe('Unlock', () => {
    it('should lock an organisation successfully', async () => {
      const organisationId = 100000000
      const { statusCode } = await server.inject({
        method: 'POST',
        url: `/organisation/${organisationId}/unlock`,
        payload: {
          partyNoteType: 'UnlockOrganisation',
          reason: 'Business Structure Changes'
        }
      })
      expect(statusCode).toBe(204)
    })

    it('should return server error when organisation does not exist', async () => {
      const organisationId = 999999999
      const { statusCode } = await server.inject({
        method: 'POST',
        url: `/organisation/${organisationId}/unlock`,
        payload: {
          partyNoteType: 'UnlockOrganisation',
          reason: 'Business Structure Changes'
        }
      })
      expect(statusCode).toBe(500)
    })

    it('should return bad request when payload is invalid', async () => {
      const organisationId = 100000000
      const { statusCode } = await server.inject({
        method: 'POST',
        url: `/organisation/${organisationId}/unlock`,
        payload: {
          partyNoteType: 'UnlockOrganisation',
          reason: {}
        }
      })
      expect(statusCode).toBe(400)
    })
  })
})
