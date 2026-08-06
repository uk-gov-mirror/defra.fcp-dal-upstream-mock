import { fakerEN_GB } from '@faker-js/faker'

export const faker = fakerEN_GB

// set default ref date to 2025-01-01 to ensure consistent dates using faker.seed
// https://fakerjs.dev/api/faker#setdefaultrefdate:~:text=faker.setDefaultRefDate()%3A%20For%20generating%20reproducible%20dates.
faker.setDefaultRefDate(new Date('2025-01-01'))

// faker.seed only accepts numbers, so non-numeric seeds (e.g. permission
// function names) are hashed to a stable integer.
const hashString = (str) =>
  [...str].reduce((hash, char) => (hash * 31 + char.charCodeAt(0)) % 2147483647, 7)

const intOrHash = (value) => {
  const integer = Number.parseInt(value, 10)
  return Number.isNaN(integer) ? hashString(`${value}`) : integer
}
export const safeSeed = (seed) => {
  if (Array.isArray(seed)) {
    return faker.seed(seed.map((s) => intOrHash(s)))
  }
  return faker.seed(intOrHash(seed))
}

export const fakeAddress = (overrides = {}) => ({
  address1: faker.location.buildingNumber(),
  address2: faker.location.streetAddress(),
  address3: faker.location.city(),
  address4: faker.location.zipCode('??# #??'),
  address5: faker.location.country(),
  pafOrganisationName: null,
  flatName: null,
  buildingNumberRange: null,
  buildingName: null,
  street: null,
  city: faker.location.city(),
  county: null,
  postalCode: faker.location.zipCode(),
  country: faker.helpers.weightedArrayElement([
    { weight: 7, value: 'England' },
    { weight: 1, value: 'Northern Ireland' },
    { weight: 3, value: 'Scotland' },
    { weight: 2, value: 'Wales' }
  ]),
  uprn: faker.string.numeric(12),
  dependentLocality: null,
  doubleDependentLocality: null,
  addressTypeId: null,
  ...overrides
})

export const fakeId = () => faker.number.int({ min: 100_000_000, max: 9_999_999_999 })
export const fakeIds = (count, min = 100_000_000, max = 9_999_999_999) =>
  Array.from({ length: count }, () => faker.number.int({ min, max }))

export const nft = (...weights) =>
  faker.helpers.weightedArrayElement([
    { weight: weights[0] || 3, value: null },
    { weight: weights[1] || 2, value: false },
    { weight: weights[2] || 5, value: true }
  ])
export const nullOrFake = (fakeFn, nullWeight = 0.5) =>
  faker.datatype.boolean(nullWeight) ? null : fakeFn()

// replicate non-standard kits date format, e.g. '2019-01-30T12:25:23:023Z'
// NOTE: the seconds:milliseconds separator is a colon `:`, not a dot `.` !!
export const transformDate = (date) => date.toISOString().replace('.', ':')

// replicate non-standard kits date format, e.g. '2019-01-30T12:25:23:023+0000'
// NOTE: the seconds:milliseconds separator is a colon `:`, not a dot `.` !! and the timezone
export const transformTimestamp = (date) => transformDate(date).replace('Z', '+0000')

export const toTitleCase = (str) =>
  str.toLocaleLowerCase().replaceAll(/\b\w/g, (c) => c.toUpperCase())

export function generateId(startingId, excludeList) {
  do {
    startingId += 1
  } while (excludeList.includes(startingId))

  return startingId
}

export const paginate = (items, offset, limit) => {
  const total = items.length
  const start = Number.isInteger(offset) && offset > 0 ? offset : 0
  const size = Number.isInteger(limit) && limit > 0 ? limit : total || 20
  const data = items.slice(start, start + size)

  return {
    data,
    page: {
      number: Math.floor(start / size),
      size,
      totalPages: Math.ceil(total / size),
      numberOfElements: data.length,
      totalElements: total
    }
  }
}

export const normalisePostcode = (postcode) => `${postcode}`.replaceAll(/\s/g, '').toUpperCase()
