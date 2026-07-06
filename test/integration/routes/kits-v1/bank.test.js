import Hapi from '@hapi/hapi'
import { bank } from '../../../../src/routes/kits-v1/bank.js'

const url = '/bank-change-service/v1/submit'
const validateUrl = '/bank-change-service/v1/validate'

const knownSbi = 2222222222

const validPayload = () => ({
  organisationId: '2222222222',
  personId: '22222220',
  sbi: String(knownSbi),
  frn: '2222222222',
  crn: '2222222000',
  submissionDateTime: '02/05/2026 14:12:11',
  account: {
    accountType: 'UK_BUSINESS',
    name: 'John Doe',
    number: '11111100',
    bank: {
      name: 'Match Bank',
      sortCode: '111111'
    }
  },
  country: { code: 'GB', currency: 'GBP' }
})

const validValidatePayload = () => {
  const payload = validPayload()
  delete payload.organisationId
  delete payload.personId
  return payload
}

let server

beforeAll(async () => {
  server = Hapi.server()
  server.route(bank)
  await server.initialize()
})

afterAll(async () => {
  await server.stop()
})

describe('POST /bank-change-service/v1/submit', () => {
  describe('success scenarios', () => {
    it('returns 200 with an empty body for a fully populated valid request', async () => {
      const { result, statusCode } = await server.inject({
        method: 'POST',
        url,
        payload: validPayload()
      })
      expect(statusCode).toBe(200)
      expect(result).toEqual({})
    })

    it('returns 200 for a UK account without an explicit sortCode (now optional)', async () => {
      const payload = validPayload()
      delete payload.account.bank.sortCode
      const { statusCode } = await server.inject({ method: 'POST', url, payload })
      expect(statusCode).toBe(200)
    })

    it('returns 200 for an EU account with both number and IBAN', async () => {
      const payload = validPayload()
      payload.account = {
        accountType: 'EU',
        name: 'Jane Doe',
        number: '12345678',
        iban: 'PT392831273127334616',
        bank: {
          name: 'Acme Bank',
          swiftCode: 'ABCDPTPL'
        }
      }
      payload.country = { code: 'PT', currency: 'EUR' }
      const { statusCode } = await server.inject({ method: 'POST', url, payload })
      expect(statusCode).toBe(200)
    })

    it('returns 200 with building society roll number', async () => {
      const payload = validPayload()
      payload.account.buildingSocietyRollNumber = '23123414'
      const { statusCode } = await server.inject({ method: 'POST', url, payload })
      expect(statusCode).toBe(200)
    })
  })

  describe('error scenarios', () => {
    it('returns 400 with code 20 when all top-level required fields are missing', async () => {
      const { result, statusCode } = await server.inject({
        method: 'POST',
        url,
        payload: {}
      })
      expect(statusCode).toBe(400)
      expect(result).toEqual({
        errors: [
          {
            code: 20,
            description:
              'Organisation id,Person id,SBI,FRN,CRN,Submission date/time,Account information,Country information is missing'
          }
        ]
      })
    })

    it('returns 400 listing missing account fields when account is empty', async () => {
      const payload = validPayload()
      payload.account = {}
      const { result, statusCode } = await server.inject({ method: 'POST', url, payload })
      expect(statusCode).toBe(400)
      expect(result).toEqual({
        errors: [
          {
            code: 20,
            description: 'Account type,Account name,Account number,Account bank details is missing'
          }
        ]
      })
    })

    it.each([
      {
        name: 'bank.name is missing',
        mutate: (p) => {
          delete p.account.bank.name
        },
        expected: /Bank name is missing/
      },
      {
        name: 'account.number is missing (even when iban is provided)',
        mutate: (p) => {
          delete p.account.number
          p.account.iban = 'PT392831273127334616'
        },
        expected: /Account number is missing/
      },
      {
        name: 'account.number is shorter than 4 chars',
        mutate: (p) => {
          p.account.number = '123'
        },
        expected: /at least 4 characters/
      },
      {
        name: 'account type is not in the allowed enum',
        mutate: (p) => {
          p.account.accountType = 'UNKNOWN'
        },
        expected: /Unknown account type/
      },
      {
        name: 'SBI is not found',
        mutate: (p) => {
          p.sbi = '999999999'
        },
        expected: /Organisation not found/
      },
      {
        name: 'country is missing',
        mutate: (p) => {
          delete p.country
        },
        expected: /Country information is missing/
      },
      {
        name: 'country.currency is missing',
        mutate: (p) => {
          p.country = { code: 'GB' }
        },
        expected: /Currency is missing/
      },
      {
        name: 'currency is not in the EUR/GBP enum',
        mutate: (p) => {
          p.country = { code: 'US', currency: 'USD' }
        },
        expected: /Unknown currency/
      },
      {
        name: 'country code is unknown',
        mutate: (p) => {
          p.country = { code: 'ZZ', currency: 'GBP' }
        },
        expected: /country code/
      },
      {
        name: 'currency does not match country code',
        mutate: (p) => {
          p.country = { code: 'GB', currency: 'EUR' }
        },
        expected: /Currency/
      }
    ])('returns 400 with code 20 when $name', async ({ mutate, expected }) => {
      const payload = validPayload()
      mutate(payload)
      const { result, statusCode } = await server.inject({ method: 'POST', url, payload })
      expect(statusCode).toBe(400)
      expect(result.errors[0].code).toBe(20)
      expect(result.errors[0].description).toMatch(expected)
    })
  })
})

describe('GET /bank-change-service/v1/locked-status/{organisationId}/{personId}', () => {
  it('returns locked:false for an org/person pair that has no recent failures', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/bank-change-service/v1/locked-status/1111111111/11111111'
    })
    expect(statusCode).toBe(200)
    expect(result).toEqual({ locked: false })
  })

  it('returns locked:true', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/bank-change-service/v1/locked-status/1111111111/11111119'
    })
    expect(statusCode).toBe(200)
    expect(result).toEqual({ locked: true })
  })
})

describe('GET /bank-change-service/v1/account-status/{organisationId}', () => {
  it('returns editable:true for an organisation with no overrides', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/bank-change-service/v1/account-status/1111111111'
    })
    expect(statusCode).toBe(200)
    expect(result).toEqual({
      editable: true,
      submitted: false,
      updatedRecently: false,
      new: false
    })
  })

  it('returns editable:false when the org was recently submitted', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/bank-change-service/v1/account-status/2222222222'
    })
    expect(statusCode).toBe(200)
    expect(result).toEqual({
      editable: false,
      submitted: true,
      updatedRecently: true,
      new: false
    })
  })

  it('returns editable:false when the org is new', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/bank-change-service/v1/account-status/3333333333'
    })
    expect(statusCode).toBe(200)
    expect(result).toEqual({
      editable: false,
      submitted: false,
      updatedRecently: false,
      new: true
    })
  })

  it('returns editable:true when only updatedRecently is set', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/bank-change-service/v1/account-status/9000001'
    })
    expect(statusCode).toBe(200)
    expect(result).toEqual({
      editable: true,
      submitted: false,
      updatedRecently: true,
      new: false
    })
  })
})

describe('GET /bank-change-service/v1/existing-accounts/{frn}', () => {
  it('returns the accounts held in DAX for a known FRN', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/bank-change-service/v1/existing-accounts/2222222222'
    })
    expect(statusCode).toBe(200)
    expect(result).toEqual({
      accounts: [
        { number: '1234', currency: 'GBP' },
        { number: '5678', currency: 'EUR' }
      ]
    })
  })

  it('returns an empty accounts list for an FRN with no accounts in DAX', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/bank-change-service/v1/existing-accounts/9999999999'
    })
    expect(statusCode).toBe(200)
    expect(result).toEqual({ accounts: [] })
  })
})

describe('POST /bank-change-service/v1/validate', () => {
  describe('success scenarios', () => {
    it('returns MATCH for the default happy-path payload', async () => {
      const { result, statusCode } = await server.inject({
        method: 'POST',
        url: validateUrl,
        payload: validValidatePayload()
      })
      expect(statusCode).toBe(200)
      expect(result.status).toBe('MATCH')
      expect(result.attemptsRemaining).toBe(0)
      expect(result.account.bank.name).toBe('Match Bank')
      expect(result.account.bank.sortCode).toBe('111111')
    })

    it.each([
      ['11111100', 'MATCH'],
      ['22222200', 'PARTIAL_MATCH']
    ])('returns %s -> %s based on the submitted account number', async (accountNumber, status) => {
      const payload = validValidatePayload()
      payload.account.number = accountNumber
      const { result, statusCode } = await server.inject({
        method: 'POST',
        url: validateUrl,
        payload
      })
      expect(statusCode).toBe(200)
      expect(result.status).toBe(status)
      expect(result.attemptsRemaining).toBe(0)
    })

    it('normalises a dashed sort code in the echoed response', async () => {
      const payload = validValidatePayload()
      payload.account.bank.sortCode = '60-83-71'
      const { result, statusCode } = await server.inject({
        method: 'POST',
        url: validateUrl,
        payload
      })
      expect(statusCode).toBe(200)
      expect(result.account.bank.sortCode).toBe('608371')
    })

    it('echoes iban and swiftCode in the success response when supplied', async () => {
      const payload = validValidatePayload()
      payload.account = {
        accountType: 'EU',
        name: 'Jane Doe',
        number: '11111100',
        iban: 'PT392831273127334616',
        bank: { name: 'Acme Bank', swiftCode: 'ABCDPTPL' }
      }
      payload.country = { code: 'PT', currency: 'EUR' }
      const { result, statusCode } = await server.inject({
        method: 'POST',
        url: validateUrl,
        payload
      })
      expect(statusCode).toBe(200)
      expect(result.status).toBe('MATCH')
      expect(result.account.iban).toBe('PT392831273127334616')
      expect(result.account.bank.swiftCode).toBe('ABCDPTPL')
    })
  })

  describe('failure scenarios', () => {
    it('returns FAILED for the FAILED test account number', async () => {
      const payload = validValidatePayload()
      payload.account.number = '33333300'
      const { result, statusCode } = await server.inject({
        method: 'POST',
        url: validateUrl,
        payload
      })
      expect(statusCode).toBe(200)
      expect(result.status).toBe('FAILED')
      expect(result.message).toBe("Details don't match")
      expect(result.attemptsRemaining).toBe(2)
      expect(result.account.bank.sortCode).toBe('111111')
    })
  })

  describe('validation error scenarios', () => {
    it('returns 400 with code 20 when required top-level fields are missing', async () => {
      const { result, statusCode } = await server.inject({
        method: 'POST',
        url: validateUrl,
        payload: {}
      })
      expect(statusCode).toBe(400)
      expect(result).toEqual({
        errors: [
          {
            code: 20,
            description:
              'SBI,FRN,CRN,Submission date/time,Account information,Country information is missing'
          }
        ]
      })
    })

    it('returns 400 when the SBI is not found', async () => {
      const payload = validValidatePayload()
      payload.sbi = '999999999'
      const { result, statusCode } = await server.inject({
        method: 'POST',
        url: validateUrl,
        payload
      })
      expect(statusCode).toBe(400)
      expect(result.errors[0].code).toBe(20)
      expect(result.errors[0].description).toMatch(/Organisation not found/)
    })

    it('returns 400 when the account type is unknown', async () => {
      const payload = validValidatePayload()
      payload.account.accountType = 'UNKNOWN'
      const { result, statusCode } = await server.inject({
        method: 'POST',
        url: validateUrl,
        payload
      })
      expect(statusCode).toBe(400)
      expect(result.errors[0].description).toMatch(/Unknown account type/)
    })
  })
})

describe('GET /bank-change-service/v1/country-codes', () => {
  it('returns the country/currency mapping conforming to the schema', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/bank-change-service/v1/country-codes'
    })
    expect(statusCode).toBe(200)
    expect(result.countriesCurrency).toEqual({
      GB: 'GBP',
      IE: 'EUR',
      IRL: 'EUR',
      PT: 'EUR'
    })
  })
})
