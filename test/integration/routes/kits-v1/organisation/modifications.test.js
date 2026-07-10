describe('Changes to organisation data', () => {
  let mockServer
  const PROCESS_ENV = process.env

  beforeAll(async () => {
    process.env = { ...PROCESS_ENV }
    process.env.PORT = '3097' // Set to obscure port to avoid conflicts
    const { startServer } = await import('../../../../../src/server.js')
    mockServer = await startServer()
  })
  afterAll(() => {
    process.env = PROCESS_ENV
    mockServer?.stop({ timeout: 0 })
  })

  describe('updateOrganisation', () => {
    const createOrgPayload = {
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

    it('should create a new organisation from data provided', async () => {
      const { statusCode, payload } = await mockServer.inject({
        method: 'POST',
        url: '/extapi/organisation/create/11111111',
        payload: createOrgPayload
      })
      expect(statusCode).toBe(200)
      expect(JSON.parse(payload)._data).toEqual(
        // snippet only, due to size of org object
        expect.objectContaining({
          id: 1000001,
          sbi: 100000001,
          ...createOrgPayload,
          legalStatus: {
            id: 102101,
            type: 'Not set'
          },
          businessType: {
            id: 101422,
            type: 'Not set'
          },
          address: expect.objectContaining(createOrgPayload.address)
        })
      )
    })

    it("should add the new organisation to the person's orgs", async () => {
      let { statusCode, payload } = await mockServer.inject({
        method: 'POST',
        url: '/extapi/organisation/create/11111111',
        payload: createOrgPayload
      })
      expect(statusCode).toBe(200)
      const { id, sbi } = JSON.parse(payload)._data

      ;({ statusCode, payload } = await mockServer.inject({
        method: 'GET',
        url: `/extapi/organisation/person/11111111/summary`
      }))
      expect(statusCode).toBe(200)
      expect(JSON.parse(payload)._data).toEqual(
        expect.arrayContaining([expect.objectContaining({ id, sbi })])
      )
    })

    it("should add the creating person to the organisation's people", async () => {
      let { statusCode, payload } = await mockServer.inject({
        method: 'POST',
        url: '/extapi/organisation/create/11111111',
        payload: createOrgPayload
      })
      expect(statusCode).toBe(200)
      ;({ statusCode, payload } = await mockServer.inject({
        method: 'GET',
        url: `/extapi/authorisation/organisation/${JSON.parse(payload)._data.id}`
      }))
      expect(statusCode).toBe(200)
      const people = JSON.parse(payload)._data
      expect(people).toHaveLength(1)
      expect(people[0].id).toEqual('11111111')
    })
  })

  describe('updateAdditionalOrganisationDetails', () => {
    it('should update all the additional details of an organisation', async () => {
      let { statusCode, payload } = await mockServer.inject({
        method: 'GET',
        url: '/extapi/organisation/111111111'
      })
      expect(statusCode).toBe(200)
      const org = JSON.parse(payload)._data

      ;({ statusCode, payload } = await mockServer.inject({
        method: 'PUT',
        url: '/extapi/organisation/111111111/additional-business-details',
        payload: {
          legalStatus: { id: 101, type: 'some new value' },
          businessType: { id: 201, type: 'some new value' },
          companiesHouseRegistrationNumber: 'new value',
          charityCommissionRegistrationNumber: 'new value',
          dateStartedFarming: '2123-01-01'
        }
      }))
      expect(statusCode).toBe(204)
      expect(payload).toBe('')
      ;({ statusCode, payload } = await mockServer.inject({
        method: 'GET',
        url: '/extapi/organisation/111111111'
      }))
      expect(statusCode).toBe(200)
      expect(JSON.parse(payload)._data).toEqual({
        ...org,
        legalStatus: { id: 101, type: 'some new value' },
        businessType: { id: 201, type: 'some new value' },
        companiesHouseRegistrationNumber: 'new value',
        charityCommissionRegistrationNumber: 'new value',
        dateStartedFarming: new Date('2123-01-01T00:00:00.000Z').getTime()
      })
    })

    it('should partially update the additional details of an organisation', async () => {
      let { statusCode, payload } = await mockServer.inject({
        method: 'GET',
        url: '/extapi/organisation/111111111'
      })
      expect(statusCode).toBe(200)
      const org = JSON.parse(payload)._data

      ;({ statusCode, payload } = await mockServer.inject({
        method: 'PUT',
        url: '/extapi/organisation/111111111/additional-business-details',
        payload: { legalStatus: { id: 101 }, businessType: { id: 201 } }
      }))
      expect(statusCode).toBe(204)
      expect(payload).toBe('')
      ;({ statusCode, payload } = await mockServer.inject({
        method: 'GET',
        url: '/extapi/organisation/111111111'
      }))
      expect(statusCode).toBe(200)
      expect(JSON.parse(payload)._data).toEqual({
        ...org,
        legalStatus: { id: 101, type: 'Set from reference data' },
        businessType: { id: 201, type: 'Set from reference data' },
        companiesHouseRegistrationNumber: null,
        charityCommissionRegistrationNumber: null,
        dateStartedFarming: null
      })
    })
  })
})
