import { retrieveAuthorisationByFunction } from '../../factories/siti-agri/permissions.factory.js'
import { checkId } from '../../utils/shared-datatypes.js'

const responseWrapper = { errorString: null, success: true }

const errorEnvelope = { data: null, success: false, errorString: 'An error has occurred.' }

// Splits the pipe-separated list the way the upstream does
export const parseRequestedFunctions = (functions) => {
  if (functions === '') return ['']
  const tokens = functions.split('|')
  while (tokens.length && tokens.at(-1) === '') tokens.pop()
  return tokens
}

export const permissions = [
  {
    method: 'GET',
    path: '/SitiAgriApi/authorisation/organisation/{orgId}/byFunction',
    handler: async (request, h) => {
      const orgId = checkId(request, 'orgId')

      let { functions, module } = request.query
      if (functions === undefined || module === undefined) {
        return h.response(errorEnvelope).code(500)
      }
      if (Array.isArray(functions)) functions = functions.at(-1)
      if (Array.isArray(module)) module = module.at(-1)

      const requested = parseRequestedFunctions(functions)
      // an unrecognised module returns `false` for everything
      const data =
        module.toUpperCase() === 'CUST_SS_PORTAL'
          ? retrieveAuthorisationByFunction(orgId, requested)
          : Object.fromEntries(requested.map((functionName) => [functionName, false]))

      return h.response({ ...responseWrapper, data })
    }
  }
]
