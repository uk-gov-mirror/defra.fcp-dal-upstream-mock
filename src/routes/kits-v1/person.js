import Boom from '@hapi/boom'
import { config } from '../../config.js'
import { paginate } from '../../factories/common.js'
import { crnToPersonId } from '../../factories/id-lookups.js'
import {
  retrievePerson,
  retrievePersonOrgs,
  searchPeople,
  updatePerson
} from '../../factories/person/person.factory.js'
import { checkSearchPhrase } from '../../utils/shared-datatypes.js'
import { createPayloadValidator } from '../../utils/validatePayload.js'

// `primarySearchPhrase` constraints for each searchFieldType
const searchFieldTypes = {
  CUSTOMER_REFERENCE: { minLength: 10, minNumber: 1000000000 },
  PERSONAL_IDENTIFIER: { minLength: 9, minNumber: 100000000 },
  CUSTOMER_NAME: { minLength: 1, allowBoolean: true },
  CUSTOMER_POSTCODE: { minLength: 5, minNumber: 10000 },
  VENDOR_NUMBER: { minLength: 6, minNumber: 100000 },
  TRADER_NUMBER: { minLength: 6, minNumber: 100000 }
}

const mapPersonToSearchResult = ({
  id,
  firstName,
  lastName,
  address,
  personalIdentifiers,
  nationalInsuranceNumber,
  customerReferenceNumber,
  email,
  locked,
  deactivated
}) => ({
  id,
  fullName: [firstName, lastName].filter(Boolean).join(' '),
  primaryAddress: address,
  personalIdentifiers,
  nationalInsuranceNumber: nationalInsuranceNumber || null,
  customerReference: customerReferenceNumber,
  email,
  locked,
  deactivated
})

// Emulates Oracle's RR year windowing: years 0-49 become 2000-2049, years 50-99 become 1950-1999
const applyOracleYearWindowing = (timestamp) => {
  const date = new Date(timestamp)
  const year = date.getUTCFullYear()
  if (year >= 0 && year <= 49) {
    date.setUTCFullYear(year + 2000)
    return date.getTime()
  }
  if (year >= 50 && year <= 99) {
    date.setUTCFullYear(year + 1900)
    return date.getTime()
  }
  return timestamp
}

const validateUpdatePersonPayload = await createPayloadValidator(
  'routes/kits-v1/person-schema.oas.yml',
  (schema) => schema.paths['/person/{personId}'].put.requestBody.content['application/json'].schema
)

const checkPersonId = (request) => {
  const personId = Number.parseInt(request.params.personId, 10)

  if (Number.isNaN(personId) || personId < 0 || `${personId}`.length > 20) {
    throw Boom.forbidden(
      `bad personId: ${personId}, is not an integer in the acceptable range`,
      request
    )
  }

  return personId
}

export const person = [
  {
    method: 'GET',
    path: '/person/{personId}/summary',
    handler: async (request, h) => {
      let personId = checkPersonId(request)

      if (personId === config.get('personIdOverride')) {
        const crn = request?.headers?.crn
        personId = crnToPersonId[crn]
      }

      const { role, privileges, lastUpdatedOn, ...personData } = retrievePerson(personId)

      return h.response({ _data: personData })
    }
  },
  {
    method: 'POST',
    path: '/person/search',
    handler: async (request, h) => {
      const { searchFieldType, searchPhrase } = checkSearchPhrase(request, searchFieldTypes)
      const { offset, limit } = request.payload

      const matches = searchPeople(searchFieldType, searchPhrase)
      const { data, page } = paginate(matches, offset, limit)

      return h.response({
        _data: data.map(mapPersonToSearchResult),
        _page: page
      })
    }
  },
  {
    method: 'GET',
    path: '/organisation/person/{personId}/summary',
    handler: async (request, h) => {
      const personId = checkPersonId(request)

      const orgs = retrievePersonOrgs(personId)

      return h.response({
        _data: orgs,
        _page: {
          number: 1,
          size: 500,
          totalPages: 1,
          numberOfElements: orgs.length,
          totalElements: orgs.length
        }
      })
    }
  },
  {
    method: 'PUT',
    path: '/person/{personId}',
    handler: async (request, h) => {
      const personId = checkPersonId(request)
      const body = request.payload

      if (body === '' || body === null) {
        throw Boom.badRequest('empty request body not allowed', request)
      }

      if (typeof body !== 'object' || Array.isArray(body)) {
        throw Boom.badRequest('missing or invalid request body', request)
      }

      if (!validateUpdatePersonPayload(request.payload)) {
        throw Boom.badData('validation error while processing input', request)
      }

      const dob = body.dateOfBirth != null ? Number(body.dateOfBirth) : null
      if (dob != null) {
        body.dateOfBirth = applyOracleYearWindowing(dob)
        if (body.dateOfBirth >= Date.now()) {
          throw Boom.badData('validation error while processing input', request)
        }
      }

      updatePerson(personId, body)
      return h.response().code(204)
    }
  }
]
