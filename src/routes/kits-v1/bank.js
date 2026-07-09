import { faker } from '../../factories/common.js'
import {
  bankAccountStatusByOrgId,
  bankExistingAccountsByOrgId,
  bankLockedPairs,
  bankValidateTestAccounts,
  frnToOrgId,
  sbiToOrgId
} from '../../factories/id-lookups.js'

const VALIDATE_STATUSES = ['MATCH', 'PARTIAL_MATCH', 'FAILED']

const VALID_CURRENCIES = new Set(['EUR', 'GBP'])

const countriesCurrency = {
  GB: 'GBP',
  IE: 'EUR',
  IRL: 'EUR',
  PT: 'EUR'
}

const ACCOUNT_TYPES = new Set(['EU', 'UK_PERSONAL', 'UK_BUSINESS'])

const ACCOUNT_NUMBER_MIN_LENGTH = 4

// all 400s return code 20
const UPSTREAM_ERROR_CODE = 20

const errorResponse = (h, status, code, description) =>
  h.response({ errors: [{ code, description }] }).code(status)

const collectMissing = (body) => {
  const missing = []
  if (!body.organisationId) missing.push('Organisation id')
  if (!body.personId) missing.push('Person id')
  if (!body.sbi) missing.push('SBI')
  if (!body.frn) missing.push('FRN')
  if (!body.crn) missing.push('CRN')
  if (!body.submissionDateTime) missing.push('Submission date/time')
  if (!body.account || typeof body.account !== 'object') missing.push('Account information')
  if (!body.country || typeof body.country !== 'object') missing.push('Country information')
  return missing
}

const collectValidateMissing = (body) => {
  const missing = []
  if (!body.sbi) missing.push('SBI')
  if (!body.frn) missing.push('FRN')
  if (!body.crn) missing.push('CRN')
  if (!body.submissionDateTime) missing.push('Submission date/time')
  if (!body.account || typeof body.account !== 'object') missing.push('Account information')
  if (!body.country || typeof body.country !== 'object') missing.push('Country information')
  return missing
}

const collectAccountMissing = (account) => {
  const missing = []
  if (!account.accountType) missing.push('Account type')
  if (!account.name) missing.push('Account name')
  // Schema requires `number` always — upstream NPEs on accountNumber.length() if missing,
  // even when `iban` is provided.
  if (!account.number) missing.push('Account number')
  if (!account.bank || typeof account.bank !== 'object') {
    missing.push('Account bank details')
  } else if (!account.bank.name) {
    missing.push('Bank name')
  }
  return missing
}

const collectCountryMissing = (country) => {
  const missing = []
  if (!country.currency) missing.push('Currency')
  return missing
}

const validateAccountAndCountry = (h, body) => {
  const accountMissing = collectAccountMissing(body.account)
  if (accountMissing.length > 0) {
    return errorResponse(h, 400, UPSTREAM_ERROR_CODE, `${accountMissing.join(',')} is missing`)
  }

  if (String(body.account.number).length < ACCOUNT_NUMBER_MIN_LENGTH) {
    return errorResponse(
      h,
      400,
      UPSTREAM_ERROR_CODE,
      `Account number must be at least ${ACCOUNT_NUMBER_MIN_LENGTH} characters`
    )
  }

  if (!ACCOUNT_TYPES.has(body.account.accountType)) {
    return errorResponse(
      h,
      400,
      UPSTREAM_ERROR_CODE,
      `Unknown account type: ${body.account.accountType}`
    )
  }

  const countryMissing = collectCountryMissing(body.country)
  if (countryMissing.length > 0) {
    return errorResponse(h, 400, UPSTREAM_ERROR_CODE, `${countryMissing.join(',')} is missing`)
  }

  const { country } = body
  if (!VALID_CURRENCIES.has(country.currency)) {
    return errorResponse(h, 400, UPSTREAM_ERROR_CODE, `Unknown currency: ${country.currency}`)
  }
  if (country.code && !countriesCurrency[country.code]) {
    return errorResponse(h, 400, UPSTREAM_ERROR_CODE, `Unknown country code: ${country.code}`)
  }
  if (country.code && countriesCurrency[country.code] !== country.currency) {
    return errorResponse(
      h,
      400,
      UPSTREAM_ERROR_CODE,
      `Currency ${country.currency} does not match country code ${country.code}`
    )
  }

  return null
}

const DEFAULT_ACCOUNT_STATUS = { submitted: false, updatedRecently: false, new: false }

const normaliseSortCode = (value) => String(value ?? '').replaceAll(/\D/g, '')

const resolveValidateStatus = (account) => {
  const testAccount = bankValidateTestAccounts[String(account.number ?? '')]
  return testAccount?.status ?? faker.helpers.arrayElement(VALIDATE_STATUSES)
}

const buildValidateSuccess = (status, account) => {
  const message = status === 'MATCH' ? 'All good' : 'Some details did not match — please confirm'
  const response = {
    status,
    message,
    attemptsRemaining: 0,
    account: {
      bank: {}
    }
  }
  if (account.iban) response.account.iban = String(account.iban)
  if (account.bank) {
    if (account.bank.name) response.account.bank.name = String(account.bank.name)
    const sortCode = normaliseSortCode(account.bank.sortCode)
    if (sortCode) response.account.bank.sortCode = sortCode
    if (account.bank.swiftCode) {
      response.account.bank.swiftCode = String(account.bank.swiftCode)
    }
  }
  return response
}

const buildValidateFailure = (account) => ({
  status: 'FAILED',
  message: "Details don't match",
  attemptsRemaining: 2,
  account: {
    bank: {
      sortCode: normaliseSortCode(account.bank?.sortCode)
    }
  }
})

export const bank = [
  {
    method: 'POST',
    path: '/bank-change-service/v1/submit',
    handler: async (request, h) => {
      const body = request.payload
      if (!body || typeof body !== 'object') {
        return errorResponse(h, 400, UPSTREAM_ERROR_CODE, 'Request body is missing')
      }

      const missing = collectMissing(body)
      if (missing.length > 0) {
        return errorResponse(h, 400, UPSTREAM_ERROR_CODE, `${missing.join(',')} is missing`)
      }

      const accountOrCountryError = validateAccountAndCountry(h, body)
      if (accountOrCountryError) return accountOrCountryError

      if (!sbiToOrgId[body.sbi]) {
        return errorResponse(
          h,
          400,
          UPSTREAM_ERROR_CODE,
          `{"data":null,"success":false,"errorString":"Organisation not found."}`
        )
      }

      return h.response({})
    }
  },
  {
    method: 'GET',
    path: '/bank-change-service/v1/locked-status/{organisationId}/{personId}',
    handler: async (request, h) => {
      const { organisationId, personId } = request.params
      const locked = bankLockedPairs.has(`${organisationId}:${personId}`)
      return h.response({ locked })
    }
  },
  {
    method: 'GET',
    path: '/bank-change-service/v1/account-status/{organisationId}',
    handler: async (request, h) => {
      const { organisationId } = request.params
      const status = bankAccountStatusByOrgId[organisationId] ?? DEFAULT_ACCOUNT_STATUS
      return h.response({
        editable: !(status.new || status.submitted),
        submitted: status.submitted,
        updatedRecently: status.updatedRecently,
        new: status.new
      })
    }
  },
  {
    method: 'GET',
    path: '/bank-change-service/v1/country-codes',
    handler: async (_request, h) => {
      return h.response({ countriesCurrency })
    }
  },
  {
    method: 'GET',
    path: '/bank-change-service/v1/existing-accounts/{frn}',
    handler: async (request, h) => {
      const { frn } = request.params
      const orgId = frnToOrgId[frn]
      const accounts = bankExistingAccountsByOrgId[orgId] ?? []
      return h.response({ accounts })
    }
  },
  {
    method: 'POST',
    path: '/bank-change-service/v1/validate',
    handler: async (request, h) => {
      const body = request.payload
      if (!body || typeof body !== 'object') {
        return errorResponse(h, 400, UPSTREAM_ERROR_CODE, 'Request body is missing')
      }

      const missing = collectValidateMissing(body)
      if (missing.length > 0) {
        return errorResponse(h, 400, UPSTREAM_ERROR_CODE, `${missing.join(',')} is missing`)
      }

      const accountOrCountryError = validateAccountAndCountry(h, body)
      if (accountOrCountryError) return accountOrCountryError

      if (!sbiToOrgId[body.sbi]) {
        return errorResponse(
          h,
          400,
          UPSTREAM_ERROR_CODE,
          `{"data":null,"success":false,"errorString":"Organisation not found."}`
        )
      }

      const status = resolveValidateStatus(body.account)
      if (status === 'FAILED') {
        return h.response(buildValidateFailure(body.account))
      }
      return h.response(buildValidateSuccess(status, body.account))
    }
  }
]
