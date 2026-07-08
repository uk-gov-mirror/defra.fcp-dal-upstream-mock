import { config } from '../../src/config.js'

describe('Basic queries for faked routes', () => {
  let mockServer
  const PROCESS_ENV = process.env

  beforeAll(async () => {
    process.env = { ...PROCESS_ENV }
    process.env.PORT = '3097' // Set to obscure port to avoid conflicts
    const { startServer } = await import('../../src/server.js')
    mockServer = await startServer()
  })
  afterAll(() => {
    process.env = PROCESS_ENV
    mockServer?.stop({ timeout: 0 })
  })

  describe('Health route', () => {
    it('Should respond successfully for /health', async () => {
      const response = await mockServer.inject({
        method: 'GET',
        url: '/health'
      })
      expect(response.statusCode).toBe(200)
      const json = JSON.parse(response.payload)
      expect(json).toEqual({ message: 'success' })
    })
  })

  describe('Person routes', () => {
    const personFixture = {
      address: {
        address1: '65',
        address2: '1 McCullough Path',
        address3: 'Newton Ratkedon',
        address4: 'MS9 8BJ',
        address5: 'North Macedonia',
        addressTypeId: null,
        buildingName: null,
        buildingNumberRange: null,
        city: 'Newton Bruen',
        country: 'Wales',
        county: null,
        dependentLocality: null,
        doubleDependentLocality: null,
        flatName: null,
        pafOrganisationName: null,
        postalCode: 'TC2 8KP',
        street: null,
        uprn: '790214962932'
      },
      confirmed: false,
      customerReferenceNumber: '1111111100',
      dateOfBirth: 91391413473,
      deactivated: false,
      doNotContact: false,
      email: 'lauren.sanford@immaculate-shark.info',
      emailValidated: false,
      firstName: 'Lauren',
      id: 11111111,
      landline: '055 4582 4488',
      lastName: 'Sanford',
      locked: false,
      middleName: 'Daryl',
      mobile: '056 8967 5108',
      otherTitle: 'I',
      personalIdentifiers: ['8568845789', '370030956', '7899566034'],
      title: 'Mrs.'
    }

    test('Should return data /person/{personId}/summary', async () => {
      const response = await mockServer.inject({
        method: 'GET',
        url: '/extapi/person/11111111/summary'
      })
      expect(response.statusCode).toBe(200)
      const json = JSON.parse(response.payload)
      expect(json._data).toEqual(personFixture)
    })

    test('Should return data /person/{personId}/summary corresponding to crn for personIdOverride', async () => {
      const response = await mockServer.inject({
        method: 'GET',
        url: `/extapi/person/${config.get('personIdOverride')}/summary`,
        headers: { crn: '1111111100' }
      })
      expect(response.statusCode).toBe(200)
      const json = JSON.parse(response.payload)
      expect(json._data).toEqual(expect.objectContaining(personFixture))
    })

    test('Should return data /person/search', async () => {
      const response = await mockServer.inject({
        method: 'POST',
        url: '/extapi/person/search',
        payload: {
          primarySearchPhrase: '1111111100',
          searchFieldType: 'CUSTOMER_REFERENCE'
        }
      })
      expect(response.statusCode).toBe(200)
      const json = JSON.parse(response.payload)
      expect(json._data).toHaveLength(1)
      expect(json._data[0]).toEqual({
        customerReference: '1111111100',
        deactivated: false,
        email: 'lauren.sanford@immaculate-shark.info',
        fullName: 'Lauren Sanford',
        id: 11111111,
        locked: false,
        nationalInsuranceNumber: null,
        personalIdentifiers: ['8568845789', '370030956', '7899566034'],
        primaryAddress: personFixture.address
      })
    })

    test('Should return data /organisation/person/{personId}/summary', async () => {
      const response = await mockServer.inject({
        method: 'GET',
        url: `/extapi/organisation/person/11111111/summary`
      })
      expect(response.statusCode).toBe(200)
      const json = JSON.parse(response.payload)
      expect(json._data).toHaveLength(1)
      expect(json._data[0]).toEqual(
        // snippet only, due to size of person object
        expect.objectContaining({
          additionalSbiIds: [],
          confirmed: true,
          deactivated: false,
          id: 1111111111,
          landConfirmed: true,
          locked: false,
          name: 'Maggio, Murray and Dicki',
          sbi: 1111111111
        })
      )
    })

    test('Should accept data to PUT /person/{personId}', async () => {
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
        doNotContact: !personFixture.doNotContact,
        emailValidated: !personFixture.emailValidated,
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
          postalCode: 'TE5 7PC',
          street: 'test-street',
          uprn: 'test-uprn'
        },
        locked: !personFixture.locked,
        confirmed: !personFixture.confirmed,
        customerReferenceNumber: 'test-crn',
        personalIdentifiers: ['not', 'set'],
        deactivated: !personFixture.deactivated
      }

      const response = await mockServer.inject({
        method: 'PUT',
        url: '/extapi/person/11111111',
        headers: {
          email: 'test@defra.gov.uk'
        },
        payload: { ...payload, address: { ...payload.address, extra: 'chuff' }, more: 'jazz' }
      })
      expect(response.statusCode).toBe(204)
      expect(response.payload).toBe('')

      const updated = await mockServer.inject({
        method: 'GET',
        url: '/extapi/person/11111111/summary'
      })
      expect(updated.statusCode).toBe(200)
      const json = JSON.parse(updated.payload)
      expect(json._data).toEqual({
        ...payload,
        // data which should not be updated remains the same
        customerReferenceNumber: personFixture.customerReferenceNumber,
        emailValidated: personFixture.emailValidated,
        confirmed: personFixture.confirmed,
        locked: personFixture.locked,
        deactivated: personFixture.deactivated,
        personalIdentifiers: personFixture.personalIdentifiers
      })
    })

    test('Should fail if no data PUT /person/{personId}', async () => {
      const response = await mockServer.inject({
        method: 'PUT',
        url: '/extapi/person/11111111',
        headers: {
          email: 'test@defra.gov.uk'
        },
        payload: {}
      })

      expect(response.statusCode).toBe(422)
      expect(response.payload).toEqual('{"code":422,"message":"HTTP 422 "}')
    })

    describe('with static person data overrides', () => {
      const staticPersonFixture = {
        // fake generated data
        dateOfBirth: 1065270380449,
        deactivated: false,
        doNotContact: false,
        id: 11111119,
        landline: '01215 090627',
        locked: false,
        personalIdentifiers: ['6526436999', '3644818157', '7559856338'],
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

      test('Should return data /person/{personId}/summary', async () => {
        const response = await mockServer.inject({
          method: 'GET',
          url: '/extapi/person/11111119/summary'
        })
        expect(response.statusCode).toBe(200)
        const json = JSON.parse(response.payload)
        expect(json._data).toEqual(staticPersonFixture)
      })

      test('Should return data /person/search', async () => {
        const response = await mockServer.inject({
          method: 'POST',
          url: '/extapi/person/search',
          payload: {
            primarySearchPhrase: '1111111900',
            searchFieldType: 'CUSTOMER_REFERENCE'
          }
        })
        expect(response.statusCode).toBe(200)
        const json = JSON.parse(response.payload)
        expect(json._data).toHaveLength(1)
        expect(json._data[0]).toEqual({
          customerReference: '1111111900',
          deactivated: false,
          email: 'skeleton@the-closet.net',
          fullName: 'Big Skeleton',
          id: 11111119,
          locked: false,
          nationalInsuranceNumber: null,
          personalIdentifiers: ['6526436999', '3644818157', '7559856338'],
          primaryAddress: staticPersonFixture.address
        })
      })
    })
  })

  describe('Organisation routes', () => {
    test('Should return data for /organisation/1111111111', async () => {
      const response = await mockServer.inject({
        method: 'GET',
        url: '/extapi/organisation/1111111111'
      })
      expect(response.statusCode).toBe(200)
      const json = JSON.parse(response.payload)
      expect(json._data).toEqual(
        // snippet only, due to size of org object
        expect.objectContaining({
          additionalBusinessActivities: null,
          additionalSbiIds: [],
          address: {
            address1: '14',
            address2: '16 Fourth Avenue',
            address3: 'Miller-under-Raynor',
            address4: 'XP0 6TX',
            address5: 'Saint Helena',
            addressTypeId: null,
            buildingName: null,
            buildingNumberRange: null,
            city: 'South Witting Green',
            country: 'England',
            county: null,
            dependentLocality: null,
            doubleDependentLocality: null,
            flatName: null,
            pafOrganisationName: 'Maggio, Murray and Dicki',
            postalCode: 'IH1 1MM',
            street: null,
            uprn: '563449849116'
          },
          businessReference: '6561479446',
          businessType: {
            id: 513326,
            type: 'Not Specified'
          },
          charityCommissionRegistrationNumber: null,
          companiesHouseRegistrationNumber: 'GyPDmr5q',
          confirmed: true,
          correspondenceAddress: null,
          correspondenceEmail: 'Anita4@hotmail.com',
          correspondenceEmailValidated: true,
          correspondenceFax: null,
          correspondenceLandline: '0813 645 0023',
          correspondenceMobile: '0800 531443',
          deactivated: false,
          email: 'Joe_Pollich@gmail.com',
          emailValidated: true,
          fax: null,
          hasAdditionalBusinessActivities: false,
          hasLandInNorthernIreland: true,
          hasLandInScotland: true,
          hasLandInWales: false,
          id: 1111111111,
          isAccountablePeopleDeclarationCompleted: null,
          isCorrespondenceAsBusinessAddr: null,

          isFinancialToBusinessAddr: null,
          landConfirmed: true,
          landline: '010952 63723',
          legalStatus: {
            id: 846100,
            type: 'Sole Proprietorship'
          },
          locked: false,
          mobile: '0800 008521',
          name: 'Maggio, Murray and Dicki',
          persons: [],
          sbi: 1111111111,
          taxRegistrationNumber: '227285823',
          traderNumber: '735338',
          vendorNumber: '581452'
        })
      )
    })

    test('Should return data for /organisation/search', async () => {
      const response = await mockServer.inject({
        method: 'POST',
        url: '/extapi/organisation/search',
        payload: {
          primarySearchPhrase: '1111111111',
          searchFieldType: 'SBI'
        }
      })
      expect(response.statusCode).toBe(200)
      const json = JSON.parse(response.payload)
      expect(json._data[0]).toEqual(
        // snippet only, due to size of org object
        expect.objectContaining({
          additionalSbiIds: [],
          address: {
            address1: '14',
            address2: '16 Fourth Avenue',
            address3: 'Miller-under-Raynor',
            address4: 'XP0 6TX',
            address5: 'Saint Helena',
            addressTypeId: null,
            buildingName: null,
            buildingNumberRange: null,
            city: 'South Witting Green',
            country: 'England',
            county: null,
            dependentLocality: null,
            doubleDependentLocality: null,
            flatName: null,
            pafOrganisationName: 'Maggio, Murray and Dicki',
            postalCode: 'IH1 1MM',
            street: null,
            uprn: '563449849116'
          },
          confirmed: true,
          correspondenceAddress: null,
          deactivated: false,
          id: 1111111111,
          isCorrespondenceAsBusinessAddr: null,
          isFinancialToBusinessAddr: null,
          landConfirmed: true,
          locked: false,
          name: 'Maggio, Murray and Dicki',
          sbi: 1111111111
        })
      )
    })

    describe('with static organisation data overrides', () => {
      // Matches cleanControlBase + minimalMandatoryAddress in src/factories/sfd-test-data/business.js
      const staticOrgFixture = {
        name: 'Clean control',
        address: {
          address1: '123 Test Street',
          address2: null,
          address3: null,
          address4: 'Test County',
          address5: null,
          city: 'Test City',
          county: null,
          postalCode: 'TE1 2ST',
          country: 'England',
          street: null,
          uprn: null
        },
        landline: '01234567890',
        mobile: '07123456789',
        email: 'clean.business@example.com'
      }

      test('Should return data for /organisation/{organisationId} with static overrides', async () => {
        const response = await mockServer.inject({
          method: 'GET',
          url: '/extapi/organisation/3009000'
        })
        expect(response.statusCode).toBe(200)
        const json = JSON.parse(response.payload)
        expect(json._data).toEqual(expect.objectContaining(staticOrgFixture))
      })

      test('Should return data for /organisation/search with static overrides', async () => {
        const response = await mockServer.inject({
          method: 'POST',
          url: '/extapi/organisation/search',
          payload: {
            primarySearchPhrase: '300900001',
            searchFieldType: 'SBI'
          }
        })
        expect(response.statusCode).toBe(200)
        const json = JSON.parse(response.payload)
        expect(json._data).toHaveLength(1)
        // Search returns a subset of org fields (no email, landline, mobile)
        expect(json._data[0]).toEqual(
          expect.objectContaining({
            id: 3009000,
            sbi: 300900001,
            name: staticOrgFixture.name,
            address: staticOrgFixture.address
          })
        )
      })
    })

    test('Should return data for /organisation/create/{personId}', async () => {
      const response = await mockServer.inject({
        method: 'POST',
        url: '/extapi/organisation/create/11111111',
        payload: {
          legalStatus: {
            id: 102101
          },
          businessType: {
            id: 101422
          },
          address: {
            flatName: null,
            buildingNumberRange: null,
            buildingName: 'BODYCHENAN',
            street: null,
            city: 'PWLLHELI',
            county: null,
            postalCode: 'LL53 8NT',
            country: 'United Kingdom',
            uprn: '10070366332',
            dependentLocality: 'LLANGWNADL',
            doubleDependentLocality: null
          },
          name: 'test unique 123',
          email: 'test@test.com',
          landline: '01234613020',
          mobile: '07111222333',
          companiesHouseRegistrationNumber: null,
          charityCommissionRegistrationNumber: '12312312',
          businessReference: '1106599951',
          hasAdditionalBusinessActivities: true,
          taxRegistrationNumber: '123456789'
        }
      })
      expect(response.statusCode).toBe(200)
      const json = JSON.parse(response.payload)
      expect(json._data).toEqual(
        // snippet only, due to size of org object
        expect.objectContaining({
          id: 1000001,
          sbi: 100000001,
          legalStatus: {
            id: 102101,
            type: 'Not set'
          },
          businessType: {
            id: 101422,
            type: 'Not set'
          },
          address: {
            address1: null,
            address2: null,
            address3: null,
            address4: null,
            address5: null,
            addressTypeId: null,
            flatName: null,
            buildingNumberRange: null,
            buildingName: 'BODYCHENAN',
            street: null,
            city: 'PWLLHELI',
            county: null,
            postalCode: 'LL53 8NT',
            country: 'United Kingdom',
            uprn: '10070366332',
            dependentLocality: 'LLANGWNADL',
            doubleDependentLocality: null,
            pafOrganisationName: null
          },
          correspondenceAddress: null,
          correspondenceFax: null,
          deactivated: false,
          fax: null,
          name: 'test unique 123',
          email: 'test@test.com',
          landline: '01234613020',
          mobile: '07111222333',
          landConfirmed: null,
          companiesHouseRegistrationNumber: null,
          charityCommissionRegistrationNumber: '12312312',
          businessReference: '1106599951',
          confirmed: true,
          locked: false,
          persons: [],
          additionalSbiIds: [],
          additionalBusinessActivities: null,
          hasAdditionalBusinessActivities: true,
          taxRegistrationNumber: '123456789'
        })
      )

      // Also check org added to person
      const personOrgs = await mockServer.inject({
        method: 'GET',
        url: `/extapi/organisation/person/11111111/summary`
      })

      expect(personOrgs.statusCode).toBe(200)
      const personJson = JSON.parse(personOrgs.payload)
      expect(personJson._data).toHaveLength(2)
      expect(personJson._data[1].id).toEqual(json._data.id)

      // Also check person added to org
      const orgPersons = await mockServer.inject({
        method: 'GET',
        url: `/extapi/authorisation/organisation/${json._data.id}`
      })

      expect(orgPersons.statusCode).toBe(200)
      const orgJson = JSON.parse(orgPersons.payload)
      expect(orgJson._data).toHaveLength(1)
      expect(orgJson._data[0].id).toEqual('11111111')
    })

    test('Should return data for /authorisation/organisation/{organisationId}', async () => {
      const response = await mockServer.inject({
        method: 'GET',
        url: '/extapi/authorisation/organisation/1111111111'
      })
      expect(response.statusCode).toBe(200)
      const json = JSON.parse(response.payload)
      expect(json._data[1]).toEqual(
        // snippet only, due to size of org object
        expect.objectContaining({
          firstName: 'Kristy',
          id: 11111112,
          customerReference: '1111111200',
          lastName: 'Stiedemann',
          lastUpdatedOn: 1735619955643,
          privileges: [
            'Full permission - business',
            'SUBMIT - CS APP - SA',
            'SUBMIT - CS AGREE - SA',
            'Amend - land',
            'Amend - entitlement',
            'Submit - bps',
            'SUBMIT - BPS - SA',
            'AMEND - ENTITLEMENT - SA',
            'AMEND - LAND - SA',
            'Submit - cs app',
            'Submit - cs agree',
            'ELM_APPLICATION_SUBMIT'
          ],
          role: 'Director'
        })
      )
    })

    test('Should return customers for /authorisation/organisation/{organisationId} for SFD business-details org', async () => {
      const response = await mockServer.inject({
        method: 'GET',
        url: '/extapi/authorisation/organisation/3009000'
      })
      expect(response.statusCode).toBe(200)
      const json = JSON.parse(response.payload)
      expect(json._data.length).toBeGreaterThan(0)
      // Verify each customer has expected shape with id and customerReference
      json._data.forEach((customer) => {
        expect(customer).toHaveProperty('id')
        expect(customer).toHaveProperty('customerReference')
      })
    })

    test('Should return customers for /authorisation/organisation/{organisationId} for SFD business-details org with multiple customers', async () => {
      const response = await mockServer.inject({
        method: 'GET',
        url: '/extapi/authorisation/organisation/3009001'
      })
      expect(response.statusCode).toBe(200)
      const json = JSON.parse(response.payload)
      expect(json._data.length).toBeGreaterThan(0)
      // Verify each customer has expected shape with id and customerReference
      json._data.forEach((customer) => {
        expect(customer).toHaveProperty('id')
        expect(customer).toHaveProperty('customerReference')
      })
    })

    test('Should return customers for /authorisation/organisation/{organisationId} for SFD performance-data org', async () => {
      const response = await mockServer.inject({
        method: 'GET',
        url: '/extapi/authorisation/organisation/5583575'
      })
      expect(response.statusCode).toBe(200)
      const json = JSON.parse(response.payload)
      expect(json._data.length).toBeGreaterThan(0)
      json._data.forEach((customer) => {
        expect(customer).toHaveProperty('id')
        expect(customer).toHaveProperty('customerReference')
      })
    })
  })

  describe('Search routes', () => {
    const search = (url, searchFieldType, primarySearchPhrase) =>
      mockServer.inject({
        method: 'POST',
        url,
        payload: { searchFieldType, primarySearchPhrase }
      })

    describe('/organisation/search', () => {
      test.each([
        ['SBI', '910000000'],
        ['BUSINESS_NAME', 'fArM'], // partial match, ignoring case
        ['BUSINESS_POSTCODE', 'ab123cd'] // full match, ignoring case and whitespace
      ])('Should find the organisation by %s', async (searchFieldType, primarySearchPhrase) => {
        const response = await search(
          '/extapi/organisation/search',
          searchFieldType,
          primarySearchPhrase
        )
        expect(response.statusCode).toBe(200)
        const json = JSON.parse(response.payload)
        expect(json._data).toHaveLength(1)
        expect(json._data[0]).toEqual(
          expect.objectContaining({
            id: 9100000,
            sbi: 910000000,
            name: 'Blue Barn Farm',
            address: expect.objectContaining({ postalCode: 'AB12 3CD' })
          })
        )
        expect(json._page).toEqual(
          expect.objectContaining({ numberOfElements: 1, totalElements: 1 })
        )
      })

      test('Should return empty results when nothing matches', async () => {
        const response = await search('/extapi/organisation/search', 'SBI', '999999999')
        expect(response.statusCode).toBe(200)
        const json = JSON.parse(response.payload)
        expect(json._data).toEqual([])
        expect(json._page).toEqual(
          expect.objectContaining({ numberOfElements: 0, totalElements: 0 })
        )
      })

      test('Should reject an unrecognised searchFieldType', async () => {
        const response = await search('/extapi/organisation/search', 'NOT_A_TYPE', '910000000')
        expect(response.statusCode).toBe(400)
      })

      test('Should error when only searchFieldType is provided', async () => {
        const response = await search('/extapi/organisation/search', 'SBI', undefined)
        expect(response.statusCode).toBe(500)
      })

      test('Should reject a too-short primarySearchPhrase', async () => {
        const response = await search('/extapi/organisation/search', 'SBI', '12345678')
        expect(response.statusCode).toBe(400)
      })
    })

    describe('/person/search', () => {
      test.each([
        ['CUSTOMER_REFERENCE', '9100000000'],
        ['PERSONAL_IDENTIFIER', '116172867'],
        ['CUSTOMER_NAME', 'sEArchington'], // partial surname match, ignoring case
        ['CUSTOMER_POSTCODE', 'ab12 3cd'], // full match, ignoring case and whitespace
        ['VENDOR_NUMBER', '123456'], // people of orgs with a matching vendor number
        ['TRADER_NUMBER', '654321'] // people of orgs with a matching trader number
      ])('Should find the person by %s', async (searchFieldType, primarySearchPhrase) => {
        const response = await search('/extapi/person/search', searchFieldType, primarySearchPhrase)
        expect(response.statusCode).toBe(200)
        const json = JSON.parse(response.payload)
        expect(json._data).toHaveLength(1)
        expect(json._data[0]).toEqual(
          expect.objectContaining({
            id: 9100000,
            fullName: 'Searchable Searchington',
            customerReference: '9100000000',
            personalIdentifiers: ['116172867'],
            primaryAddress: expect.objectContaining({ postalCode: 'AB12 3CD' })
          })
        )
        expect(json._page).toEqual(
          expect.objectContaining({ numberOfElements: 1, totalElements: 1 })
        )
      })

      test('Should return empty results when nothing matches', async () => {
        const response = await search('/extapi/person/search', 'CUSTOMER_REFERENCE', '9999999999')
        expect(response.statusCode).toBe(200)
        const json = JSON.parse(response.payload)
        expect(json._data).toEqual([])
        expect(json._page).toEqual(
          expect.objectContaining({ numberOfElements: 0, totalElements: 0 })
        )
      })

      test('Should reject an unrecognised searchFieldType', async () => {
        const response = await search('/extapi/person/search', 'NOT_A_TYPE', '9100000000')
        expect(response.statusCode).toBe(400)
      })

      test('Should error when only searchFieldType is provided', async () => {
        const response = await search('/extapi/person/search', 'CUSTOMER_NAME', undefined)
        expect(response.statusCode).toBe(500)
      })

      test('Should reject a too-short primarySearchPhrase', async () => {
        const response = await search('/extapi/person/search', 'CUSTOMER_REFERENCE', '123456789')
        expect(response.statusCode).toBe(400)
      })
    })

    describe('pagination', () => {
      const pagedSearch = (url, searchFieldType, primarySearchPhrase, offset, limit) =>
        mockServer.inject({
          method: 'POST',
          url,
          payload: { searchFieldType, primarySearchPhrase, offset, limit }
        })

      test.each([
        ['/extapi/organisation/search', 'BUSINESS_NAME', 'and'],
        ['/extapi/person/search', 'CUSTOMER_NAME', 'a']
      ])('slices %s by offset and limit', async (url, searchFieldType, primarySearchPhrase) => {
        const all = JSON.parse(
          (await pagedSearch(url, searchFieldType, primarySearchPhrase, 0, 1000)).payload
        )._data
        expect(all.length).toBeGreaterThan(2)

        const offset = 2
        const limit = 2
        const response = await pagedSearch(url, searchFieldType, primarySearchPhrase, offset, limit)
        expect(response.statusCode).toBe(200)
        const json = JSON.parse(response.payload)

        expect(json._data).toEqual(all.slice(offset, offset + limit))
        expect(json._page).toEqual({
          number: 1,
          size: limit,
          totalPages: Math.ceil(all.length / limit),
          numberOfElements: json._data.length,
          totalElements: all.length
        })
      })
    })
  })

  describe('Notifications routes', () => {
    test('Should return data for /notifications', async () => {
      const response = await mockServer.inject({
        method: 'GET',
        url: '/extapi/notifications?personId=11111111&organisationId=1111111111'
      })
      expect(response.statusCode).toBe(200)
      const json = JSON.parse(response.payload)

      expect(json.resultCount).toEqual(9)
      expect(json.readCount).toEqual(6)
      expect(json.unreadCount).toEqual(3)
      expect(json.notifications.length).toEqual(9)
    })
  })
})
