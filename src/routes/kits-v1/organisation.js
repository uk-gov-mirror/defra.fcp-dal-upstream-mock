import Boom from '@hapi/boom'
import { paginate } from '../../factories/common.js'
import {
  createAuthorisation,
  createOrganisation,
  lockOrganisation,
  retrieveOrganisation,
  retrieveOrganisationCustomers,
  searchOrganisations,
  unlockOrganisation,
  updateAdditionalOrganisationDetails,
  updateAuthorisation,
  updateOrganisation
} from '../../factories/organisation/organisation.factory.js'
import { checkId, checkSearchPhrase } from '../../utils/shared-datatypes.js'
import { createPayloadValidator } from '../../utils/validatePayload.js'

// `primarySearchPhrase` constraints for each searchFieldType
const searchFieldTypes = {
  SBI: { minLength: 9, minNumber: 100000000 },
  BUSINESS_NAME: { minLength: 2, minNumber: 10 },
  BUSINESS_POSTCODE: { minLength: 5, minNumber: 10000 }
}

const mapOrgToSearchResult = ({
  id,
  name,
  sbi,
  additionalSbiIds,
  confirmed,
  lastUpdatedOn,
  landConfirmed,
  deactivated,
  locked,
  address,
  correspondenceAddress,
  isFinancialToBusinessAddr,
  isCorrespondenceAsBusinessAddr
}) => ({
  id,
  name,
  sbi,
  additionalSbiIds,
  confirmed,
  lastUpdatedOn,
  landConfirmed,
  deactivated,
  locked,
  address,
  correspondenceAddress,
  isFinancialToBusinessAddr,
  isCorrespondenceAsBusinessAddr
})

const validateLockOrganisationPayload = await createPayloadValidator(
  'routes/kits-v1/organisation-schema.oas.yml',
  (schema) =>
    schema.paths['/organisation/{organisationId}/lock'].post.requestBody.content['application/json']
      .schema
)

const validateUnlockOrganisationPayload = await createPayloadValidator(
  'routes/kits-v1/organisation-schema.oas.yml',
  (schema) =>
    schema.paths['/organisation/{organisationId}/unlock'].post.requestBody.content[
      'application/json'
    ].schema
)

export const organisation = [
  {
    method: 'GET',
    path: '/organisation/{organisationId}',
    handler: async (request, h) => {
      const organisationId = checkId(request, 'organisationId')

      // Special cases to return specific status codes
      if (organisationId == 3000000500) {
        throw Boom.error('Server error from this API.')
      } else if (organisationId == 3000000401) {
        throw Boom.unauthorized('Unauthorized access to this API.')
      } else if (organisationId == 3000000403) {
        throw Boom.forbidden('Forbidden access to this API.')
      } else if (organisationId == 3000000206) {
        return h.response('{}').code(206)
      } else {
        return h.response({ _data: retrieveOrganisation(organisationId) })
      }
    }
  },
  {
    method: 'POST',
    path: '/organisation/search',
    handler: async (request, h) => {
      const { searchFieldType, searchPhrase } = checkSearchPhrase(request, searchFieldTypes)
      const { offset, limit } = request.payload

      const matches = searchOrganisations(searchFieldType, searchPhrase)
      const { data, page } = paginate(matches, offset, limit)

      return h.response({
        _data: data.map(mapOrgToSearchResult),
        _page: page
      })
    }
  },
  {
    method: 'GET',
    path: '/authorisation/organisation/{organisationId}',
    handler: async (request, h) => {
      return h.response({ _data: retrieveOrganisationCustomers(request.params.organisationId) })
    }
  },
  {
    method: 'PUT',
    path: '/organisation/{organisationId}/business-details',
    handler: async (request, h) => {
      return h.response({
        _data: updateOrganisation(request.params.organisationId, request.payload)
      })
    }
  },
  {
    method: 'PUT',
    path: '/organisation/{organisationId}/additional-business-details',
    handler: async (request, h) => {
      const organisationId = checkId(request, 'organisationId')
      const body = request.payload

      if (
        typeof body !== 'object' ||
        Array.isArray(body) ||
        body === null ||
        // required fields
        !body.businessType?.id ||
        !body.legalStatus?.id
      ) {
        throw Boom.badRequest(`bad payload: ${body}, expected an object`, request)
      }

      try {
        updateAdditionalOrganisationDetails(organisationId, body)
      } catch (e) {
        if (e.isBoom) {
          // 404 is a 500 upstream!!
          throw Boom.internal(`Organisation with ID: ${organisationId} not found`, request)
        }
        throw e
      }

      return h.response().code(204)
    }
  },
  {
    method: 'POST',
    path: '/organisation/create/{personId}',
    handler: async (request, h) => {
      return h.response({
        _data: createOrganisation(request.params.personId, request.payload)
      })
    }
  },
  {
    method: 'POST',
    path: '/organisation/{organisationId}/lock',
    handler: async (request, h) => {
      const organisationId = checkId(request, 'organisationId')

      if (!validateLockOrganisationPayload(request.payload)) {
        throw Boom.badRequest('validation error while processing input', request)
      }

      lockOrganisation(organisationId)

      return h.response().code(204)
    }
  },
  {
    method: 'POST',
    path: '/organisation/{organisationId}/unlock',
    handler: async (request, h) => {
      const organisationId = checkId(request, 'organisationId')

      if (!validateUnlockOrganisationPayload(request.payload)) {
        throw Boom.badRequest('validation error while processing input', request)
      }

      unlockOrganisation(organisationId)

      return h.response().code(204)
    }
  },
  {
    method: 'POST',
    path: '/SitiAgriApi/authorisation/organisation/{orgId}/authorisation',
    handler: async (request, h) => {
      const orgId = checkId(request, 'orgId')
      try {
        const result = createAuthorisation(orgId, request.payload)
        return h.response({ success: true }).code(201)
      } catch {
        return h.response({ success: false })
      }
    }
  },
  {
    method: 'PUT',
    path: '/SitiAgriApi/authorisation/organisation/{orgId}/authorisation/person/{personId}',
    handler: async (request, h) => {
      const orgId = checkId(request, 'orgId')
      const personId = checkId(request, 'personId')

      try {
        const result = updateAuthorisation(orgId, personId, request.payload)
        return h.response({ success: true }).code(200)
      } catch (e) {
        return h.response({ success: false, errorString: e.message })
      }
    }
  }
]
