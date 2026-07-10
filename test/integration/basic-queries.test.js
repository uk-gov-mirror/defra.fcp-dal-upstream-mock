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

  describe('Organisation routes', () => {
    test('should return organisation data', async () => {
      const response = await mockServer.inject({
        method: 'GET',
        url: '/extapi/organisation/9100000'
      })
      expect(response.statusCode).toBe(200)
      const json = JSON.parse(response.payload)
      expect(json._data).toMatchObject(
        // snippet only, due to size of org object
        expect.objectContaining({
          name: 'Blue Barn Farm',
          vendorNumber: '123456',
          traderNumber: '654321',
          address: {
            address1: 'Blue Barn',
            address2: null,
            address3: null,
            address4: null,
            address5: null,
            pafOrganisationName: 'Blue Barn Farm',
            flatName: null,
            buildingNumberRange: null,
            buildingName: null,
            street: null,
            city: 'Searchton',
            county: null,
            postalCode: 'AB12 3CD',
            country: 'England',
            uprn: '910000000001',
            dependentLocality: null,
            doubleDependentLocality: null,
            addressTypeId: null
          },
          sbi: 910000000
        })
      )
    })

    test('should return organisation data when searching by SBI', async () => {
      const { result, statusCode } = await mockServer.inject({
        method: 'POST',
        url: '/extapi/organisation/search',
        payload: {
          primarySearchPhrase: '910000000',
          searchFieldType: 'SBI'
        }
      })
      expect(statusCode).toBe(200)
      expect(result._data[0]).toEqual(
        // snippet only, due to size of org object
        expect.objectContaining({
          id: 9100000,
          sbi: 910000000,
          name: 'Blue Barn Farm',
          address: {
            address1: 'Blue Barn',
            address2: null,
            address3: null,
            address4: null,
            address5: null,
            pafOrganisationName: 'Blue Barn Farm',
            flatName: null,
            buildingNumberRange: null,
            buildingName: null,
            street: null,
            city: 'Searchton',
            county: null,
            postalCode: 'AB12 3CD',
            country: 'England',
            uprn: '910000000001',
            dependentLocality: null,
            doubleDependentLocality: null,
            addressTypeId: null
          }
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
        url: '/extapi/authorisation/organisation/111111111'
      })
      expect(response.statusCode).toBe(200)
      const json = JSON.parse(response.payload)
      expect(json._data[1]).toEqual(
        // snippet only, due to size of org object
        expect.objectContaining({
          firstName: 'Royce',
          id: 11111112,
          customerReference: '1111111200',
          lastName: 'Skiles',
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
          role: 'Owner or Sole Trader'
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
        url: '/extapi/notifications?personId=11111111&organisationId=111111111'
      })
      expect(response.statusCode).toBe(200)
      const json = JSON.parse(response.payload)

      expect(json.resultCount).toEqual(8)
      expect(json.readCount).toEqual(4)
      expect(json.unreadCount).toEqual(4)
      expect(json.notifications.length).toEqual(8)
    })
  })
})
