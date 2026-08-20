import Boom from '@hapi/boom'
import { createLogger } from '../../common/helpers/logging/logger.js'
import {
  retrieveCovers,
  retrieveCoversSummary,
  retrieveParcelDetails,
  retrieveParcelGeometries,
  retrieveParcels
} from '../../factories/land/land.factory.js'

const logger = createLogger('land.route')

// Upstream's WAF only lets 1-19 digit organisationId path segments through.
const ORGANISATION_ID_PATTERN = /^\d{1,19}$/

// 19-digit values that overflow a Java Long fail upstream's path-param conversion with a plain 404
const JAVA_LONG_MAX = 9223372036854775807n

const extractOrganisationId = (request, { parseAsLong = true } = {}) => {
  const organisationId = request.params.organisationId
  if (!ORGANISATION_ID_PATTERN.test(organisationId)) {
    logger.warn(`Badly formed organisation ID (${organisationId})`)
    throw Boom.forbidden()
  }
  if (parseAsLong && BigInt(organisationId) > JAVA_LONG_MAX) {
    logger.warn(`Organisation ID overflows a Java Long (${organisationId})`)
    throw Boom.notFound()
  }
  return organisationId
}

const validateBbox = (request) => {
  const { bbox } = request.query

  if (!bbox) {
    throw Boom.badRequest('bbox query parameter must be specified')
  }

  // Upstream returns 404 (not 400) if bbox isn't exactly 4 comma-separated numbers
  const coordinates = bbox.split(',')
  if (
    coordinates.length !== 4 ||
    coordinates.some((coordinate) => Number.isNaN(Number.parseFloat(coordinate)))
  ) {
    logger.warn('bbox must contain 4 comma separated numbers')
    throw Boom.notFound()
  }

  return bbox
}

const extractIncludeGeometries = (request) => {
  const { includeGeometries } = request.query
  return includeGeometries?.toLowerCase() === 'true'
}

// Dates must have format DD-MMM-YY (e.g. 10-Jul-24)
const HISTORIC_DATE_PATTERN = /^\d{2}-[A-Za-z]{3}-\d{2}$/

const PARSEABLE_DATE_PATTERN =
  /^(0[1-9]|[12]\d|3[01])-(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)-\d{2}$/

const validateHistoricDate = (request) => {
  const { historicDate } = request.params
  if (!HISTORIC_DATE_PATTERN.test(historicDate)) {
    logger.warn(`Badly formed historic date (${historicDate})`)
    throw Boom.forbidden()
  }
  if (!PARSEABLE_DATE_PATTERN.test(historicDate)) {
    logger.warn(`Unparseable historic date (${historicDate})`)
    throw Boom.internal()
  }
}

export const land = [
  {
    method: 'GET',
    path: '/lms/organisation/{organisationId}/parcels/historic/{historicDate}',
    handler: async (request, h) => {
      const organisationId = extractOrganisationId(request)
      validateHistoricDate(request)

      const parcels = retrieveParcels(organisationId)
      return h.response(parcels)
    }
  },
  {
    method: 'GET',
    path: '/lms/organisation/{organisationId}/parcel-details/historic/{historicDate}',
    handler: async (request, h) => {
      const organisationId = extractOrganisationId(request)
      validateHistoricDate(request)

      const parcelDetails = retrieveParcelDetails(organisationId)
      return h.response(parcelDetails)
    }
  },
  {
    method: 'GET',
    path: '/lms/organisation/{organisationId}/parcel/sheet-id/{sheetId}/parcel-id/{parcelId}/historic/{historicDate}/land-covers',
    handler: async (request, h) => {
      const { sheetId, parcelId } = request.params

      const organisationId = extractOrganisationId(request, { parseAsLong: false })
      validateHistoricDate(request)
      const includeGeometries = extractIncludeGeometries(request)

      const covers = retrieveCovers(organisationId, sheetId, parcelId, includeGeometries)
      return h.response(covers)
    }
  },
  {
    method: 'GET',
    path: '/lms/organisation/{organisationId}/covers-summary/historic/{historicDate}',
    handler: async (request, h) => {
      const organisationId = extractOrganisationId(request)
      validateHistoricDate(request)

      const coversSummary = retrieveCoversSummary(organisationId)
      return h.response(coversSummary)
    }
  },
  {
    method: 'GET',
    path: '/lms/organisation/{organisationId}/geometries',
    handler: async (request, h) => {
      const organisationId = extractOrganisationId(request)

      // bbox is required and validated by the upstream API but the mock doesn't
      // spatially filter on it - the generated parcel geometries aren't tied to
      // real-world coordinates, so all the org's parcel geometries are returned
      // regardless of bbox/historicDate.
      validateBbox(request)

      const geometries = retrieveParcelGeometries(organisationId)
      return h.response(geometries)
    }
  }
]
