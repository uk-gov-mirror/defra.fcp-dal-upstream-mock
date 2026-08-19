import Boom from '@hapi/boom'
import { personUpdateSchema } from '../../common/update-schemas.js'
import {
  crnToPersonId,
  orgIdLookup,
  orgIdToPersonIds,
  orgIdToSbi,
  personIdToOrgIds,
  staticPersonData
} from '../../factories/id-lookups.js'
import { applyUpdates } from '../../utils/applyUpdates.js'
import { fakeAddress, fakeIds, faker, normalisePostcode, safeSeed } from '../common.js'
import { retrieveOrganisation } from '../organisation/organisation.factory.js'

const people = {}

const generatePerson = (personId, crn, overrides = {}) => {
  personId = safeSeed(personId)
  const firstName = faker.person.firstName()
  const lastName = faker.person.lastName()
  const person = {
    id: personId,
    title: faker.person.prefix(),
    otherTitle: faker.person.suffix(),
    firstName,
    middleName: faker.person.firstName(),
    lastName: lastName,
    dateOfBirth: faker.date.birthdate({ min: 18, max: 90, mode: 'age' }).getTime(),
    landline: faker.phone.number(),
    mobile: faker.phone.number(),
    email: `${firstName.toLowerCase()}.${lastName.toLowerCase()}@${faker.internet.domainName()}`,
    doNotContact: faker.datatype.boolean(),
    emailValidated: faker.datatype.boolean(),
    address: fakeAddress(),
    locked: faker.datatype.boolean(),
    confirmed: faker.datatype.boolean(),
    customerReferenceNumber: crn,
    personalIdentifiers: fakeIds(faker.number.int({ min: 0, max: 3 })).map((id) => `${id}`),
    deactivated: faker.datatype.boolean(),
    role: faker.helpers.arrayElement([
      'Owner or Sole Trader',
      'Key Contact',
      'Agent',
      'Director',
      'Trustee'
    ]),
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
    lastUpdatedOn: faker.date.recent().getTime(),
    ...overrides
  }

  people[personId] = person

  return person
}

export const retrievePerson = (personId) => {
  const person = people[personId]
  if (person) {
    return person
  }

  const { crn, ...overrides } = staticPersonData[personId] ?? {}
  if (!crn) {
    throw Boom.notFound(`person with personId ${personId} not found`)
  }

  return generatePerson(personId, crn, overrides)
}

export const retrievePersonOrgs = (personId) => {
  const orgIds = personIdToOrgIds[personId] || []
  const orgs = orgIds.map((orgId) => {
    const org = retrieveOrganisation(orgId)
    return {
      id: orgId,
      sbi: orgIdToSbi[orgId],
      name: org.name,
      additionalSbiIds: org.additionalSbiIds,
      confirmed: org.confirmed,
      lastUpdatedOn: org.lastUpdatedOn,
      landConfirmed: org.landConfirmed,
      deactivated: org.deactivated,
      locked: org.locked
    }
  })
  return orgs
}

export const allPeople = () =>
  Object.keys(staticPersonData).map((personId) => retrievePerson(personId))

// find all the people belonging to orgs matching the search function
const peopleInOrgsWhere = (search) => {
  const orgIds = Object.keys(orgIdLookup).filter((orgId) => search(retrieveOrganisation(orgId)))
  // only persons that exsist
  const personIds = new Set(orgIds.flatMap((orgId) => orgIdToPersonIds[orgId] ?? []))
  return [...personIds]
    .filter((personId) => personId in staticPersonData)
    .map((personId) => retrievePerson(personId))
}

const personMatchers = {
  CUSTOMER_REFERENCE: (crn) => (crnToPersonId[crn] ? [retrievePerson(crnToPersonId[crn])] : []),
  PERSONAL_IDENTIFIER: (identifier) =>
    allPeople()
      .filter((person) => person.personalIdentifiers?.includes(identifier))
      .slice(0, 1),
  // upstream only matches on surname, not firstname/full-name
  CUSTOMER_NAME: (name) =>
    allPeople().filter((person) => person.lastName?.toLowerCase().includes(name.toLowerCase())),
  CUSTOMER_POSTCODE: (postcode) =>
    allPeople().filter(
      (person) =>
        person.address?.postalCode &&
        normalisePostcode(person.address.postalCode) === normalisePostcode(postcode)
    ),
  VENDOR_NUMBER: (phrase) => peopleInOrgsWhere((org) => org.vendorNumber?.startsWith(phrase)),
  TRADER_NUMBER: (phrase) => peopleInOrgsWhere((org) => org.traderNumber?.startsWith(phrase))
}

export const searchPeople = (searchFieldType, searchPhrase) =>
  personMatchers[searchFieldType](searchPhrase)

export const updatePerson = (personId, updatesToPerson) => {
  const person = retrievePerson(personId)

  return (people[personId] = applyUpdates(personUpdateSchema, person, updatesToPerson))
}
