import Hapi from '@hapi/hapi'
import { config } from '../../../../../src/config.js'
import { person } from '../../../../../src/routes/kits-v1/person.js'
import { loadSchema } from '../../../../../src/utils/validatePayload.js'

describe('Person routes', () => {
  let server, schema
  beforeAll(async () => {
    server = Hapi.server()
    server.route(person)
    await Promise.all([
      server.initialize(),
      loadSchema('/routes/kits-v1/person-schema.oas.yml').then((s) => (schema = s))
    ])
  })

  it('should GET a person conforming to the schema', async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/person/11111111/summary'
    })
    expect(statusCode).toBe(200)
    expect(result).toConformToSchema(
      schema.paths['/person/{personId}/summary'].get.responses['200'].content['application/json']
        .schema
    )
  })

  it('should respond with a person conforming to schema when searches POST-ed', async () => {
    const { result, statusCode } = await server.inject({
      method: 'POST',
      url: '/person/search',
      payload: {
        searchFieldType: 'CUSTOMER_REFERENCE',
        primarySearchPhrase: '1111111100'
      }
    })
    expect(statusCode).toBe(200)
    expect(result).toConformToSchema(
      schema.paths['/person/search'].post.responses['200'].content['application/json'].schema
    )
  })

  it('should fetch the same person with ID or CRN', async () => {
    const id = 11111111
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: `/person/${id}/summary`
    })
    expect(statusCode).toBe(200)
    expect(result._data.id).toBe(id)
    const {
      firstName,
      lastName,
      address,
      personalIdentifiers,
      customerReferenceNumber,
      email,
      locked,
      deactivated
    } = result._data

    const res2 = await server.inject({
      headers: {
        'content-type': 'application/json'
      },
      method: 'POST',
      url: '/person/search',
      payload: {
        searchFieldType: 'CUSTOMER_REFERENCE',
        primarySearchPhrase: customerReferenceNumber
      }
    })
    expect(res2.statusCode).toBe(200)
    expect(res2.result._data.length).toBe(1)
    const samePerson = res2.result._data[0]
    expect(samePerson).toEqual({
      id,
      fullName: `${firstName} ${lastName}`,
      primaryAddress: address,
      personalIdentifiers: personalIdentifiers,
      nationalInsuranceNumber: null,
      customerReference: customerReferenceNumber,
      email: email,
      locked: locked,
      deactivated: deactivated
    })
  })

  test("should return data for about the specified user's associated organisations", async () => {
    const { result, statusCode } = await server.inject({
      method: 'GET',
      url: '/organisation/person/11111222/summary'
    })
    expect(statusCode).toBe(200)
    expect(result._data).toHaveLength(2)
    expect(result._data).toEqual(
      // snippets only, to indicate the 2 organisations this user belongs to
      expect.arrayContaining([
        expect.objectContaining({
          id: 111111111,
          sbi: 111111111
        }),
        expect.objectContaining({
          id: 222222222,
          sbi: 222222222
        })
      ])
    )
  })

  describe('the external gateway', () => {
    test('should return data /person/{personId}/summary corresponding to crn for personIdOverride', async () => {
      const { result, statusCode } = await server.inject({
        method: 'GET',
        url: `/person/${config.get('personIdOverride')}/summary`,
        headers: { crn: '1111111100' }
      })
      expect(statusCode).toBe(200)
      expect(result).toConformToSchema(
        schema.paths['/person/{personId}/summary'].get.responses['200'].content['application/json']
          .schema
      )
    })

    test('should return data /person/search', async () => {
      const { result, statusCode } = await server.inject({
        method: 'POST',
        url: '/person/search',
        payload: {
          primarySearchPhrase: '1111111100',
          searchFieldType: 'CUSTOMER_REFERENCE'
        }
      })
      expect(statusCode).toBe(200)
      expect(result._data).toHaveLength(1)
      expect(statusCode).toBe(200)
      expect(result).toConformToSchema(
        schema.paths['/person/search'].post.responses['200'].content['application/json'].schema
      )
    })
  })

  describe('with static person data overrides', () => {
    const staticPersonFixture = {
      // fake generated data
      dateOfBirth: 1065270380449,
      doNotContact: false,
      id: 11111119,
      // static overridden data
      customerReferenceNumber: '1111111900',
      firstName: 'Big',
      middleName: null,
      lastName: 'Skeleton',
      address: {
        address1: 'A dark dark cellar',
        address2: 'A dark dark staircase',
        address3: 'A dark dark house',
        street: 'A dark dark street',
        city: 'A dark dark town',
        dependentLocality: 'A dark dark hill'
      },
      email: 'skeleton@the-closet.net',
      emailValidated: true,
      confirmed: true,
      mobile: null,
      title: null,
      otherTitle: null
    }

    test('should return data /person/{personId}/summary', async () => {
      const response = await server.inject({
        method: 'GET',
        url: '/person/11111119/summary'
      })
      expect(response.statusCode).toBe(200)
      const json = JSON.parse(response.payload)
      expect(json._data).toEqual(expect.objectContaining(staticPersonFixture))
    })

    test('should return data /person/search', async () => {
      const response = await server.inject({
        method: 'POST',
        url: '/person/search',
        payload: {
          primarySearchPhrase: '1111111900',
          searchFieldType: 'CUSTOMER_REFERENCE'
        }
      })
      expect(response.statusCode).toBe(200)
      const json = JSON.parse(response.payload)
      expect(json._data).toHaveLength(1)
      expect(json._data[0]).toEqual(
        expect.objectContaining({
          customerReference: '1111111900',
          email: 'skeleton@the-closet.net',
          fullName: 'Big Skeleton',
          id: 11111119,
          nationalInsuranceNumber: null,
          primaryAddress: staticPersonFixture.address
        })
      )
    })
  })

  describe('person mutations', () => {
    test('should update person data', async () => {
      // get the current state
      const { result: personFixture } = await server.inject({
        method: 'GET',
        url: '/person/11111111/summary'
      })

      const payload = {
        id: 11111111,
        title: 'test-title',
        otherTitle: 'test-other-title',
        firstName: 'test-first-name',
        middleName: 'test-middle-name',
        lastName: 'test-last-name',
        dateOfBirth: -2,
        landline: '01234 567890',
        mobile: '07111 222333',
        email: 'test-email@test.com',
        doNotContact: !personFixture._data.doNotContact,
        emailValidated: !personFixture._data.emailValidated,
        address: {
          address1: 'test-line-1',
          address2: 'test-line-2',
          address3: 'test-line-3',
          address4: 'test-line-4',
          address5: 'test-line-5',
          addressTypeId: null,
          buildingName: 'test-building-name',
          buildingNumberRange: 'test-building-number-range',
          city: 'test-city',
          country: 'test-country',
          county: 'test-county',
          dependentLocality: 'test-dependent-locality',
          doubleDependentLocality: 'test-double-dependent-locality',
          flatName: 'test-flat-name',
          pafOrganisationName: 'test-paf-organisation-name',
          postalCode: 'TE5 5TT',
          street: 'test-street',
          uprn: 'test-uprn'
        },
        locked: !personFixture._data.locked,
        confirmed: !personFixture._data.confirmed,
        customerReferenceNumber: 'test-crn',
        personalIdentifiers: ['not', 'set'],
        deactivated: !personFixture._data.deactivated
      }
      // update the state
      const response = await server.inject({
        method: 'PUT',
        url: '/person/11111111',
        headers: {
          email: 'test@defra.gov.uk'
        },
        payload: { ...payload, address: { ...payload.address, extra: 'chuff' }, more: 'jazz' }
      })
      expect(response.statusCode).toBe(204)
      expect(response.payload).toBe('')

      // get the new state
      const updated = await server.inject({
        method: 'GET',
        url: '/person/11111111/summary'
      })
      expect(updated.statusCode).toBe(200)
      expect(updated.result._data).toEqual({
        ...payload,
        // data which should not be updated remains the same
        customerReferenceNumber: personFixture._data.customerReferenceNumber,
        emailValidated: personFixture._data.emailValidated,
        confirmed: personFixture._data.confirmed,
        locked: personFixture._data.locked,
        deactivated: personFixture._data.deactivated,
        personalIdentifiers: personFixture._data.personalIdentifiers
      })
    })

    test('should fail if no data PUT /person/{personId}', async () => {
      const { result, statusCode } = await server.inject({
        method: 'PUT',
        url: '/person/11111111',
        headers: {
          email: 'test@defra.gov.uk'
        },
        payload: {}
      })

      expect(statusCode).toBe(422)
      expect(result).toEqual({
        statusCode: 422,
        error: 'Unprocessable Entity',
        message: 'validation error while processing input'
      })
    })

    test('should accept a post-2001 dateOfBirth returned by GET', async () => {
      const { result: personFixture } = await server.inject({
        method: 'GET',
        url: '/person/11111119/summary'
      })

      const { dateOfBirth } = personFixture._data
      expect(dateOfBirth).toBeGreaterThan(999999999999)
      expect(dateOfBirth).toBeLessThan(Date.now())

      const { statusCode } = await server.inject({
        method: 'PUT',
        url: '/person/11111119',
        headers: { email: 'test@defra.gov.uk' },
        payload: {
          firstName: personFixture._data.firstName,
          lastName: personFixture._data.lastName,
          dateOfBirth
        }
      })

      expect(statusCode).toBe(204)
    })

    test('should reject a dateOfBirth that is tomorrow or later', async () => {
      const tomorrow = Date.now() + 86400000

      const { statusCode } = await server.inject({
        method: 'PUT',
        url: '/person/11111119',
        headers: { email: 'test@defra.gov.uk' },
        payload: {
          firstName: 'Test',
          lastName: 'User',
          dateOfBirth: tomorrow
        }
      })

      expect(statusCode).toBe(422)
    })

    // Oracle RR year windowing: years 0-49 become 2000+year, years 50-99 become 1900+year.
    // The "must be in the past" check runs AFTER windowing.

    test('year 0001 is windowed to 2001 and accepted (in the past)', async () => {
      const date = new Date('0001-04-05T00:00:00.000Z')
      date.setUTCFullYear(1)

      const { statusCode } = await server.inject({
        method: 'PUT',
        url: '/person/11111119',
        headers: { email: 'test@defra.gov.uk' },
        payload: { firstName: 'Test', lastName: 'User', dateOfBirth: date.getTime() }
      })
      expect(statusCode).toBe(204)

      const { result } = await server.inject({ method: 'GET', url: '/person/11111119/summary' })
      expect(new Date(result._data.dateOfBirth).getUTCFullYear()).toBe(2001)
    })

    test('year 0026 is windowed to 2026 and accepted if before today', async () => {
      const date = new Date('0026-01-01T00:00:00.000Z')
      date.setUTCFullYear(26)

      const { statusCode } = await server.inject({
        method: 'PUT',
        url: '/person/11111119',
        headers: { email: 'test@defra.gov.uk' },
        payload: { firstName: 'Test', lastName: 'User', dateOfBirth: date.getTime() }
      })
      expect(statusCode).toBe(204)

      const { result } = await server.inject({ method: 'GET', url: '/person/11111119/summary' })
      expect(new Date(result._data.dateOfBirth).getUTCFullYear()).toBe(2026)
    })

    test('year 0049 is windowed to 2049 and rejected (in the future)', async () => {
      const date = new Date('0049-04-05T00:00:00.000Z')
      date.setUTCFullYear(49)

      const { statusCode } = await server.inject({
        method: 'PUT',
        url: '/person/11111119',
        headers: { email: 'test@defra.gov.uk' },
        payload: { firstName: 'Test', lastName: 'User', dateOfBirth: date.getTime() }
      })
      expect(statusCode).toBe(422)
    })

    test('year 0050 is windowed to 1950 and accepted (in the past)', async () => {
      const date = new Date('0050-04-05T00:00:00.000Z')
      date.setUTCFullYear(50)

      const { statusCode } = await server.inject({
        method: 'PUT',
        url: '/person/11111119',
        headers: { email: 'test@defra.gov.uk' },
        payload: { firstName: 'Test', lastName: 'User', dateOfBirth: date.getTime() }
      })
      expect(statusCode).toBe(204)

      const { result } = await server.inject({ method: 'GET', url: '/person/11111119/summary' })
      expect(new Date(result._data.dateOfBirth).getUTCFullYear()).toBe(1950)
    })

    test('year 0099 is windowed to 1999 and accepted (in the past)', async () => {
      const date = new Date('0099-04-05T00:00:00.000Z')
      date.setUTCFullYear(99)

      const { statusCode } = await server.inject({
        method: 'PUT',
        url: '/person/11111119',
        headers: { email: 'test@defra.gov.uk' },
        payload: { firstName: 'Test', lastName: 'User', dateOfBirth: date.getTime() }
      })
      expect(statusCode).toBe(204)

      const { result } = await server.inject({ method: 'GET', url: '/person/11111119/summary' })
      expect(new Date(result._data.dateOfBirth).getUTCFullYear()).toBe(1999)
    })
  })
})
