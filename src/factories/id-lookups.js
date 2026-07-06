import fs from 'node:fs'
import { faker, safeSeed } from './common.js'
import { sfdBusinessLookup, sfdPersonLookup } from './sfd-test-data/index.js'

export const staticPersonData = {
  ...sfdPersonLookup,

  // people in org 1111111111 only
  11111111: { crn: '1111111100' },
  11111112: { crn: '1111111200' },
  11111113: { crn: '1111111300' },
  11111114: { crn: '1111111400' },
  11111115: { crn: '1111111500' },
  11111116: { crn: '1111111600' },
  11111117: { crn: '1111111700' },
  11111118: { crn: '1111111800' },
  11111119: {
    // static data overrides example
    crn: '1111111900',
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
  },
  // Person in org 3333333333
  11111120: {
    crn: '1111111901',
    title: 'Lady',
    otherTitle: 'Lady',
    firstName: null,
    middleName: '',
    lastName: 'Grey',
    privileges: []
  },
  // Person in org 3333333334
  11111141: {
    crn: '1111111902',
    title: 'Mr',
    otherTitle: '',
    firstName: 'Frederick',
    middleName: '',
    lastName: 'Forsyth'
  },
  // people in org 1111111111 and 2222222222
  11111122: { crn: '1111112200' },
  11111222: { crn: '1111122200' },
  11112222: { crn: '1111222200' },
  11122222: { crn: '1112222200' },
  11222222: { crn: '1122222200' },
  12222222: { crn: '1222222200' },
  // people in org 2222222222 only
  22222220: { crn: '2222222000' },
  22222221: { crn: '2222222100' },
  22222222: { crn: '2222222200' },
  22222223: { crn: '2222222300' },
  22222224: { crn: '2222222400' },
  22222225: { crn: '2222222500' },
  22222226: { crn: '2222222600' },
  22222227: { crn: '2222222700' },
  22222228: { crn: '2222222800' },
  22222229: { crn: '2222222900' },
  22222230: { crn: '2222223000' },
  22222231: { crn: '2222223100' },
  22222232: { crn: '2222223200' },
  22222233: { crn: '2222223300' },
  22222234: { crn: '2222223400' },
  22222235: { crn: '2222223500' },
  22222236: { crn: '2222223600' },
  22222237: { crn: '2222223700' },
  22222238: { crn: '2222223800' },
  22222239: { crn: '2222223900' },
  22222240: { crn: '2222224000' },
  22222241: { crn: '2222224100' },
  22222242: { crn: '2222224200' },
  22222243: { crn: '2222224300' },
  22222244: { crn: '2222224400' },
  22222245: { crn: '2222224500' },
  22222246: { crn: '2222224600' },
  22222247: { crn: '2222224700' },
  22222248: { crn: '2222224800' },
  22222249: { crn: '2222224900' },
  22222250: { crn: '2222225000' },
  22222251: { crn: '2222225100' },
  22222252: { crn: '2222225200' },
  22222253: { crn: '2222225300' },
  22222254: { crn: '2222225400' },
  22222255: { crn: '2222225500' },
  22222256: { crn: '2222225600' },
  22222257: { crn: '2222225700' },
  22222258: { crn: '2222225800' },
  22222259: { crn: '2222225900' },
  22222260: { crn: '2222226000' },
  22222261: { crn: '2222226100' },
  22222262: { crn: '2222226200' },
  22222263: { crn: '2222226300' },
  22222264: { crn: '2222226400' },
  22222265: { crn: '2222226500' },
  22222266: { crn: '2222226600' },
  22222267: { crn: '2222226700' },
  22222268: { crn: '2222226800' },
  22222269: { crn: '2222226900' },
  22222270: { crn: '2222227000' },
  22222271: { crn: '2222227100' },
  22222272: { crn: '2222227200' },
  22222273: { crn: '2222227300' },
  22222274: { crn: '2222227400' },
  22222275: { crn: '2222227500' },
  22222276: { crn: '2222227600' },
  22222277: { crn: '2222227700' },
  22222278: { crn: '2222227800' },
  22222279: { crn: '2222227900' },

  // customers not in any org - useful for DAL acceptance tests and the like
  9000000: { crn: '9000000000' },
  9000001: { crn: '9000000001' },

  // dedicated person for every /person/search searchFieldType
  9100000: {
    crn: '9100000000',
    firstName: 'Searchable',
    lastName: 'Searchington',
    personalIdentifiers: ['116172867'],
    address: {
      address1: '1 Search Lane',
      address2: null,
      address3: null,
      address4: null,
      address5: null,
      pafOrganisationName: null,
      flatName: null,
      buildingNumberRange: null,
      buildingName: null,
      street: null,
      city: 'Searchton',
      county: null,
      postalCode: 'AB12 3CD',
      country: 'England',
      uprn: '910000000000',
      dependentLocality: null,
      doubleDependentLocality: null,
      addressTypeId: null
    }
  },

  // from dev CRM
  5302028: { crn: '1103020285' },
  // from dev CRM, but do not exist on `upgrade`
  9900002: { crn: '8562286973' },
  9900003: { crn: '1638563942' },
  9900004: { crn: '3170633316' },
  9900005: { crn: '1343571956' },

  // midsummer birthdays for testing DoB edge cases - UTC timestamps as millis since the epoch
  9000010: { crn: '9000001000', dateOfBirth: new Date('2000-06-30T00:00:00Z').getTime() },
  9000011: { crn: '9000001100', dateOfBirth: new Date('1950-06-01T00:00:00Z').getTime() },
  // midwinter birthdays for testing DoB edge cases - UTC timestamps as millis since the epoch
  9000012: { crn: '9000001200', dateOfBirth: new Date('2000-01-01T00:00:00Z').getTime() },
  9000013: { crn: '9000001300', dateOfBirth: new Date('1950-12-31T00:00:00Z').getTime() },

  // and now for something completely stupid; dates stored in random timezones 🤦
  // midsummer birthdays for testing DoB edge cases
  9000014: { crn: '9000001400', dateOfBirth: new Date('01 Jun 2001 GMT+1').getTime() },
  9000015: { crn: '9000001500', dateOfBirth: new Date('30 Jun 1940 GMT+3').getTime() },
  9000016: { crn: '9000001600', dateOfBirth: new Date('01 Jun 2001 GMT-1').getTime() },
  9000017: { crn: '9000001700', dateOfBirth: new Date('30 Jun 1940 GMT-3').getTime() },
  // midwinter birthdays for testing DoB edge cases
  9000018: { crn: '9000001800', dateOfBirth: new Date('01 Jan 2001 GMT+3').getTime() },
  9000019: { crn: '9000001900', dateOfBirth: new Date('31 Dec 1969 GMT+1').getTime() },
  9000020: { crn: '9000002000', dateOfBirth: new Date('01 Jan 2001 GMT-3').getTime() },
  9000021: { crn: '9000002100', dateOfBirth: new Date('31 Dec 1969 GMT-1').getTime() }
}

const validGeometries = JSON.parse(
  // Generated using scripts/generate_geometries.sh
  fs.readFileSync(new URL('./valid-geometries.json', import.meta.url))
)
export const orgIdLookup = {
  ...sfdBusinessLookup,

  1000000000: {
    sbi: 1000000000,
    customers: [], // org with no customers
    agreements: [], // ... no agreements
    applications: [], // ... no applications
    cphs: [], // ... no CPHs
    land: [], // ... no land
    payments: { parmPayments: [] }, // ... no payments
    overrides: {} // any static overrides for this org can go here
  },
  1111111111: {
    sbi: 1111111111,
    // Bank-change attempts for this person are locked
    bankLockedPersonIds: [11111119],
    customers: [
      { personId: 11111111 },
      { personId: 11111112 },
      { personId: 11111113 },
      { personId: 11111114 },
      { personId: 11111115 },
      { personId: 11111116 },
      { personId: 11111117 },
      { personId: 11111118 },
      { personId: 11111119 },
      { personId: 11111122 },
      { personId: 11111222 },
      { personId: 11112222 },
      { personId: 11122222 },
      { personId: 11222222 },
      { personId: 12222222 }
    ],
    agreements: [
      {
        contract_id: '1111111111',
        payment_schedules: [1111111111, 1111111112, 1111111113]
      },
      {
        contract_id: '1111111112',
        payment_schedules: [1111111121, 1111111122, 1111111123]
      },
      {
        contract_id: '1111111113',
        payment_schedules: [1111111131, 1111111132, 1111111133]
      }
    ],
    applications: [{ application_history: [{}] }],
    cphs: [{}], // 1 CPH
    land: {
      parcels: [
        {
          id: 7386091,
          properties: {
            area: '10270.39',
            pendingDigitisation: false,
            sheetId: 'SS6627',
            parcelId: '5662'
          },
          geometry: validGeometries[0],
          covers: [
            {
              id: 11769295,
              properties: {
                area: '10270.38',
                code: '110',
                name: 'Arable Land',
                isBpsEligible: 'true'
              },
              type: 'Feature',
              geometry: validGeometries[2]
            },
            {
              id: 11769235,
              properties: {
                area: '25409.79',
                code: '131',
                name: 'Permanent Grassland',
                isBpsEligible: 'true'
              },
              type: 'Feature',
              geometry: validGeometries[3]
            }
          ],
          uses: [
            {
              lu_code: 'WO25'
            }
          ]
        },
        {
          id: 7386092,
          properties: {
            area: '10270.39',
            pendingDigitisation: 'false',
            sheetId: 'SS6828',
            parcelId: '3818'
          },
          geometry: validGeometries[1],
          uses: [{}]
        }
      ]
    }
  },
  2222222222: {
    sbi: 2222222222,
    // FRN: pinned to match the orgId so bank example payloads stay readable.
    overrides: { businessReference: '2222222222' },
    // Bank details not editable.
    bankAccountStatus: { submitted: true, updatedRecently: true, new: false },
    existingAccounts: [
      { number: '1234', currency: 'GBP' },
      { number: '5678', currency: 'EUR' }
    ],
    customers: [
      { personId: 11111122 },
      { personId: 11111222 },
      { personId: 11112222 },
      { personId: 11122222 },
      { personId: 11222222 },
      { personId: 12222222 },
      { personId: 22222220 },
      { personId: 22222221 },
      { personId: 22222222 },
      { personId: 22222223 },
      { personId: 22222224 },
      { personId: 22222225 },
      { personId: 22222226 },
      { personId: 22222227 },
      { personId: 22222228 },
      { personId: 22222229 },
      { personId: 22222230 },
      { personId: 22222231 },
      { personId: 22222232 },
      { personId: 22222233 },
      { personId: 22222234 },
      { personId: 22222235 },
      { personId: 22222236 },
      { personId: 22222237 },
      { personId: 22222238 },
      { personId: 22222239 },
      { personId: 22222240 },
      { personId: 22222241 },
      { personId: 22222242 },
      { personId: 22222243 },
      { personId: 22222244 },
      { personId: 22222245 },
      { personId: 22222246 },
      { personId: 22222247 },
      { personId: 22222248 },
      { personId: 22222249 },
      { personId: 22222250 },
      { personId: 22222251 },
      { personId: 22222252 },
      { personId: 22222253 },
      { personId: 22222254 },
      { personId: 22222255 },
      { personId: 22222256 },
      { personId: 22222257 },
      { personId: 22222258 },
      { personId: 22222259 },
      { personId: 22222260 },
      { personId: 22222261 },
      { personId: 22222262 },
      { personId: 22222263 },
      { personId: 22222264 },
      { personId: 22222265 },
      { personId: 22222266 },
      { personId: 22222267 },
      { personId: 22222268 },
      { personId: 22222269 },
      { personId: 22222270 },
      { personId: 22222271 },
      { personId: 22222272 },
      { personId: 22222273 },
      { personId: 22222274 },
      { personId: 22222275 },
      { personId: 22222276 },
      { personId: 22222277 },
      { personId: 22222278 },
      { personId: 22222279 }
    ],
    agreements: [
      {
        contract_id: '2222222222',
        payment_schedules: [2222222212, 2222222213, 2222222214]
      },
      {
        contract_id: '2222222223',
        payment_schedules: [2222222222, 2222222223, 2222222224]
      },
      {
        contract_id: '2222222224',
        payment_schedules: [2222222232, 2222222233, 2222222234]
      }
    ]
  },
  // Contains user with no first name and no messages
  3333333333: {
    sbi: 3333333333,
    bankAccountStatus: { submitted: false, updatedRecently: false, new: true },
    customers: [
      {
        personId: 11111120,
        messages: []
      }
    ]
  },

  // Contains user with 10 messages, 5 deleted messages
  3333333334: {
    sbi: 3333333334,
    customers: [
      {
        personId: 11111141,
        messages: [
          {},
          {},
          {},
          {},
          {},
          {},
          {},
          {},
          {},
          {}, // 10 faked messages
          { archive: true },
          { archive: true },
          { archive: true },
          { archive: true }, // 4 faked message that've been deleted
          {
            readAt: '2020-01-31T18:01:30.000Z', // read
            archivedAt: '2020-03-31T18:01:30.000Z', // deleted
            archive: true,
            title: 'Static title',
            body: '<i>static body<i>'
          } // deleted message with comprehensive static data
        ]
      }
    ]
  },

  // Orgs that always returns specific status when requested
  3000000206: { sbi: 300000206, customers: [] },
  3000000401: { sbi: 300000401, customers: [] },
  3000000403: { sbi: 300000403, customers: [] },
  3000000500: { sbi: 300000500, customers: [] },

  // business from dev CRM
  5565448: {
    sbi: 107183280,
    customers: [],
    applications: [{ application_history: [{}] }], // 1 application with 1 transition entry
    cphs: Array.from({ length: 8 }, () => ({})) // 8 CPHs
  },
  5559799: { sbi: 106238988, customers: [{ personId: 5302028 }] },
  5560725: {
    sbi: 106284736,
    customers: [
      { personId: 5302028 },
      { personId: 9900000 },
      { personId: 9900001 },
      { personId: 9900002 },
      { personId: 9900003 }
    ]
  },
  5625145: { sbi: 107591843, customers: [{ personId: 5302028 }, { personId: 5692562 }] },
  5447505: { sbi: 121428499, customers: [{ personId: 5302028 }] },

  // dedicated org for every /organisation/search searchFieldType
  9100000: {
    sbi: 910000000,
    customers: [{ personId: 9100000 }],
    overrides: {
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
      }
    }
  },

  // for DAL mutation tests
  9000001: {
    sbi: 900000001,
    customers: [],
    bankAccountStatus: { submitted: false, updatedRecently: true, new: false }
  },
  9000002: { sbi: 900000002, customers: [] },
  // for CV/DAL DoB edge case tests
  9000003: {
    sbi: 900000003,
    customers: [
      { personId: 9000010 },
      { personId: 9000011 },
      { personId: 9000012 },
      { personId: 9000013 },
      { personId: 9000014 },
      { personId: 9000015 },
      { personId: 9000016 },
      { personId: 9000017 },
      { personId: 9000018 },
      { personId: 9000019 },
      { personId: 9000020 },
      { personId: 9000021 }
    ]
  }
}

// Derived inverses — calculated once
export const crnToPersonId = Object.fromEntries(
  Object.entries(staticPersonData).map(([personId, { crn }]) => [crn, personId])
)
export const sbiToOrgId = {}
export const orgIdToSbi = {}
export const frnToOrgId = {}
export const frnToPaymentOverrides = {}
export const orgIdToPersonIds = {}
export const personIdToOrgIds = {}
export const bankAccountStatusByOrgId = {}
export const bankExistingAccountsByOrgId = {}
export const bankLockedPairs = new Set()

// Bank account test accounts. Key is account number
export const bankValidateTestAccounts = {
  11111100: { sortCode: '111111', bankName: 'Match Bank', status: 'MATCH' },
  22222200: {
    sortCode: '222222',
    bankName: 'Partial Match Bank',
    status: 'PARTIAL_MATCH'
  },
  33333300: { sortCode: '333333', bankName: 'No Match Bank', status: 'FAILED' }
}

Object.entries(orgIdLookup).forEach(([orgId, orgDetails]) => {
  const { sbi, customers, overrides, bankAccountStatus, bankLockedPersonIds, existingAccounts } =
    orgDetails
  orgIdToSbi[orgId] = sbi
  sbiToOrgId[sbi] = orgId

  // NOTE: we expect FRNs for Hitachi payments API, the "businessReference" from overrides
  if (overrides?.businessReference === undefined) {
    safeSeed(orgId) // set consistent seed point for repeatable FRNs for businesses
    const frn = faker.string.numeric(10)
    frnToPaymentOverrides[frn] = orgDetails.payments ?? {}
    // store FRN with static data overrides for later use
    orgDetails.overrides = { ...overrides, businessReference: frn }
    frnToOrgId[frn] = orgId
  } else {
    // businessReference is the FRN!
    frnToPaymentOverrides[overrides.businessReference] = orgDetails.payments ?? {}
    frnToOrgId[overrides.businessReference] = orgId
  }

  orgIdToPersonIds[orgId] = customers.map(({ personId }) => {
    if (!personIdToOrgIds[personId]) {
      personIdToOrgIds[personId] = []
    }
    personIdToOrgIds[personId].push(Number(orgId))
    return personId
  })

  if (bankAccountStatus) {
    bankAccountStatusByOrgId[orgId] = bankAccountStatus
  }
  bankLockedPersonIds?.forEach((personId) => {
    bankLockedPairs.add(`${orgId}:${personId}`)
  })

  if (bankAccountStatus) {
    bankAccountStatusByOrgId[orgId] = bankAccountStatus
  }
  bankLockedPersonIds?.forEach((personId) => {
    bankLockedPairs.add(`${orgId}:${personId}`)
  })

  if (existingAccounts) {
    bankExistingAccountsByOrgId[orgId] = existingAccounts
  }
})
