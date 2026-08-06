import {
  KNOWN_FUNCTIONS,
  retrieveAuthorisationByFunction
} from '../../../src/factories/siti-agri/permissions.factory.js'
import { loadSchema } from '../../../src/utils/validatePayload.js'

describe('permissions.factory', () => {
  describe('retrieveAuthorisationByFunction', () => {
    it('returns a boolean for each requested function, keyed in request order', () => {
      const functions = ['viewLand', 'amendBusinessDetails', 'viewEntitlements']
      const data = retrieveAuthorisationByFunction(5583781, functions)

      expect(Object.keys(data)).toEqual(functions)
      for (const value of Object.values(data)) {
        expect(typeof value).toBe('boolean')
      }
    })

    it('is deterministic for the same orgId and functions', () => {
      const functions = ['viewLand', 'amendEntitlements']
      const first = retrieveAuthorisationByFunction(5849659, functions)
      const second = retrieveAuthorisationByFunction(5849659, functions)

      expect(second).toEqual(first)
    })

    it('gives each function a stable flag regardless of request order or accompanying functions', () => {
      const alone = retrieveAuthorisationByFunction(5583781, ['viewLand'])
      const reordered = retrieveAuthorisationByFunction(5583781, [
        'amendEntitlements',
        'viewLand',
        'viewCPH'
      ])

      expect(reordered.viewLand).toBe(alone.viewLand)
    })

    it('produces a different spread of permissions for different organisations', () => {
      const functions = [
        'viewLand',
        'amendBusinessDetails',
        'viewEntitlements',
        'viewCPH',
        'amendEntitlements',
        'viewApplication',
        'submitApplication',
        'closeBusiness',
        'viewBusinessDetails',
        'applyForBPS'
      ]
      const first = retrieveAuthorisationByFunction(5583781, functions)
      const second = retrieveAuthorisationByFunction(5852711, functions)

      expect(second).not.toEqual(first)
    })

    it('returns an empty object when no functions are requested', () => {
      expect(retrieveAuthorisationByFunction(5583781, [])).toEqual({})
    })

    it('echoes back unrecognised function names as false, like the upstream', () => {
      const data = retrieveAuthorisationByFunction(5583781, ['notARealFunction'])
      expect(data).toEqual({ notARealFunction: false })
    })

    it('recognises every function documented in the OAS response schema', async () => {
      const schema = await loadSchema('routes/kits-v1/permissions-schema.oas.yml')
      const documented = Object.keys(
        schema.components.schemas.AuthorisationByFunctionResponse.properties.data.properties
      )
      expect([...KNOWN_FUNCTIONS].sort()).toEqual(documented.sort())
    })
  })
})
