import Boom from '@hapi/boom'
import {
  frnToOrgId,
  frnToPaymentOverrides,
  orgIdLookup,
  orgIdToPersonIds,
  orgIdToSbi,
  personIdToOrgIds,
  sbiToOrgId
} from '../../factories/id-lookups.js'
import {
  fakeAddress,
  fakeIds,
  faker,
  generateId,
  nft,
  normalisePostcode,
  nullOrFake,
  safeSeed
} from '../common.js'
import { retrievePerson } from '../person/person.factory.js'

const organisations = {}
let startingOrgId = 1000000
let startingSbi = 100000000

export const createOrganisation = (personId, payload) => {
  retrievePerson(personId)
  startingOrgId = generateId(startingOrgId, Object.keys(orgIdToSbi))
  startingSbi = generateId(startingSbi, Object.keys(sbiToOrgId))
  const id = startingOrgId
  const sbi = startingSbi
  const name = payload.name
  const org = {
    id,
    name,
    sbi,
    additionalSbiIds: [],
    confirmed: true,
    lastUpdatedOn: null,
    landConfirmed: null,
    deactivated: false,
    locked: false,
    address: {
      address1: payload.address?.address1 ?? null,
      address2: payload.address?.address2 ?? null,
      address3: payload.address?.address3 ?? null,
      address4: payload.address?.address4 ?? null,
      address5: payload.address?.address5 ?? null,
      pafOrganisationName: payload.address?.pafOrganisationName ?? null,
      flatName: payload.address?.flatName ?? null,
      buildingNumberRange: payload.address?.buildingNumberRange ?? null,
      buildingName: payload.address?.buildingName ?? null,
      street: payload.address?.street ?? null,
      city: payload.address?.city ?? null,
      county: payload.address?.county ?? null,
      postalCode: payload.address?.postalCode ?? null,
      country: payload.address?.country ?? null,
      uprn: payload.address?.uprn ?? null,
      dependentLocality: payload.address?.dependentLocality ?? null,
      doubleDependentLocality: payload.address?.doubleDependentLocality ?? null,
      addressTypeId: payload.address?.addressTypeId ?? null
    },
    correspondenceAddress: payload.correspondenceAddress
      ? {
          address1: payload.correspondenceAddress?.address1 ?? null,
          address2: payload.correspondenceAddress?.address2 ?? null,
          address3: payload.correspondenceAddress?.address3 ?? null,
          address4: payload.correspondenceAddress?.address4 ?? null,
          address5: payload.correspondenceAddress?.address5 ?? null,
          pafOrganisationName: payload.correspondenceAddress?.pafOrganisationName ?? null,
          flatName: payload.correspondenceAddress?.flatName ?? null,
          buildingNumberRange: payload.correspondenceAddress?.buildingNumberRange ?? null,
          buildingName: payload.correspondenceAddress?.buildingName ?? null,
          street: payload.correspondenceAddress?.street ?? null,
          city: payload.correspondenceAddress?.city ?? null,
          county: payload.correspondenceAddress?.county ?? null,
          postalCode: payload.correspondenceAddress?.postalCode ?? null,
          country: payload.correspondenceAddress?.country ?? null,
          uprn: payload.correspondenceAddress?.uprn ?? null,
          dependentLocality: payload.correspondenceAddress?.dependentLocality ?? null,
          doubleDependentLocality: payload.correspondenceAddress?.doubleDependentLocality ?? null,
          addressTypeId: payload.correspondenceAddress?.addressTypeId ?? null
        }
      : null,
    isFinancialToBusinessAddr: payload.isFinancialToBusinessAddr,
    isCorrespondenceAsBusinessAddr: payload.isCorrespondenceAsBusinessAddr,
    email: payload.email,
    emailValidated: payload.emailValidated,
    landline: payload.landline,
    mobile: payload.mobile,
    fax: null,
    correspondenceEmail: payload.correspondenceEmail,
    correspondenceEmailValidated: payload.correspondenceEmailValidated,
    correspondenceLandline: payload.correspondenceLandline,
    correspondenceMobile: payload.correspondenceMobile,
    correspondenceFax: null,
    taxRegistrationNumber: payload.taxRegistrationNumber,
    businessType: {
      id: payload.businessType.id,
      type: 'Not set'
    },
    businessReference: payload.businessReference,
    legalStatus: {
      id: payload.legalStatus.id,
      type: 'Not set'
    },
    dateStartedFarming: payload.dateStartedFarming,
    companiesHouseRegistrationNumber: payload.companiesHouseRegistrationNumber,
    charityCommissionRegistrationNumber: payload.charityCommissionRegistrationNumber,
    persons: [],
    hasLandInNorthernIreland: payload.hasLandInNorthernIreland,
    hasLandInScotland: payload.hasLandInScotland,
    hasLandInWales: payload.hasLandInWales,
    hasAdditionalBusinessActivities: payload.hasAdditionalBusinessActivities,
    vendorNumber: payload.vendorNumber,
    traderNumber: payload.traderNumber,
    isAccountablePeopleDeclarationCompleted: payload.isAccountablePeopleDeclarationCompleted,
    additionalBusinessActivities: null
  }

  // ensure all the entity relationships are also created
  organisations[id] = org
  orgIdToSbi[id] = sbi
  sbiToOrgId[sbi] = id
  orgIdLookup[id] = { sbi }
  frnToOrgId[payload.businessReference] = id
  frnToPaymentOverrides[payload.businessReference] = {}
  personIdToOrgIds[personId].push(id)
  orgIdToPersonIds[id] = [personId]

  return org
}

const generateOrganisation = (orgId, sbi, overrides = {}) => {
  orgId = safeSeed(orgId)
  const name = faker.company.name()
  const hasAdditionalBusinessActivities = nft(4, 2, 3)
  const org = {
    id: orgId,
    name,
    sbi,
    additionalSbiIds: [],
    confirmed: faker.datatype.boolean(0.9),
    lastUpdatedOn: faker.date.recent().getTime(),
    landConfirmed: faker.datatype.boolean(0.7),
    deactivated: faker.datatype.boolean(0.2),
    locked: faker.datatype.boolean(0.1),
    address: fakeAddress({ pafOrganisationName: name }),
    correspondenceAddress: nullOrFake(() => fakeAddress({ pafOrganisationName: name }), 0.7),
    isFinancialToBusinessAddr: nft(),
    isCorrespondenceAsBusinessAddr: nft(7, 2, 1),
    email: faker.internet.email(),
    emailValidated: faker.datatype.boolean(0.8),
    landline: faker.phone.number(),
    mobile: faker.phone.number(),
    fax: null,
    correspondenceEmail: faker.internet.email(),
    correspondenceEmailValidated: faker.datatype.boolean(0.8),
    correspondenceLandline: faker.phone.number(),
    correspondenceMobile: faker.phone.number(),
    correspondenceFax: null,
    taxRegistrationNumber: nullOrFake(() => faker.string.numeric(9)),
    businessType: {
      id: faker.number.int({ min: 164946, max: 964946 }),
      type: 'Not Specified'
    },
    // businessReference is actually FRN! and will always be overridden!
    // but keeping this step to ensure the rest of the data remains consistent
    businessReference: faker.string.numeric(10),
    legalStatus: {
      id: faker.number.int({ min: 164946, max: 964946 }),
      type: 'Sole Proprietorship'
    },
    dateStartedFarming: faker.date.past().toISOString(),
    companiesHouseRegistrationNumber: nullOrFake(() => faker.string.alphanumeric(8)),
    charityCommissionRegistrationNumber: nullOrFake(() => faker.string.alphanumeric(8)),
    persons: [],
    hasLandInNorthernIreland: nft(4, 2, 1),
    hasLandInScotland: nft(4, 2, 3),
    hasLandInWales: nft(4, 2, 3),
    hasAdditionalBusinessActivities,
    vendorNumber: nullOrFake(() => faker.string.numeric(6)),
    traderNumber: nullOrFake(() => faker.string.numeric(6)),
    isAccountablePeopleDeclarationCompleted: nft(7, 1, 2),
    additionalBusinessActivities: hasAdditionalBusinessActivities
      ? fakeIds(faker.number.int({ min: 1, max: 3 }), 164946, 964946).map((id, i) => ({
          id: Number.parseInt(id, 10),
          type: `Additional Business Activity ${i}`
        }))
      : null,
    ...overrides
  }

  organisations[orgId] = org

  return org
}

export const updateOrganisation = (orgId, updatesToOrg) => {
  const org = retrieveOrganisation(orgId)
  return Object.assign(org, updatesToOrg)
}
export const updateAdditionalOrganisationDetails = (
  orgId,
  {
    legalStatus,
    businessType,
    companiesHouseRegistrationNumber,
    charityCommissionRegistrationNumber,
    dateStartedFarming
  }
) => {
  const org = retrieveOrganisation(orgId)
  const newLegalStatus = { id: legalStatus.id, type: legalStatus.type ?? 'Set from reference data' }
  const newBusinessType = {
    id: businessType.id,
    type: businessType.type ?? 'Set from reference data'
  }
  Object.assign(org, {
    legalStatus: newLegalStatus,
    businessType: newBusinessType,
    companiesHouseRegistrationNumber: companiesHouseRegistrationNumber ?? null,
    charityCommissionRegistrationNumber: charityCommissionRegistrationNumber ?? null,
    dateStartedFarming: new Date(dateStartedFarming).getTime() || null
  })
}

export const retrieveOrganisation = (orgId) => {
  const { sbi, overrides } = orgIdLookup[orgId] ?? {}

  if (!sbi) {
    throw Boom.notFound(`organisation with orgId ${orgId} not found`)
  }

  return organisations[orgId] ?? generateOrganisation(orgId, sbi, overrides)
}

const allOrganisations = () => Object.keys(orgIdLookup).map((orgId) => retrieveOrganisation(orgId))

const organisationMatchers = {
  SBI: (sbi) => (sbiToOrgId[sbi] ? [retrieveOrganisation(sbiToOrgId[sbi])] : []),
  BUSINESS_NAME: (name) =>
    allOrganisations().filter((org) => org.name?.toLowerCase().includes(name.toLowerCase())),
  BUSINESS_POSTCODE: (postcode) =>
    allOrganisations().filter(
      (org) =>
        org.address?.postalCode &&
        normalisePostcode(org.address.postalCode) === normalisePostcode(postcode)
    )
}

export const searchOrganisations = (searchFieldType, searchPhrase) =>
  organisationMatchers[searchFieldType](searchPhrase)

export const retrieveOrganisationCustomers = (orgId) => {
  const personIds = orgIdToPersonIds[orgId] || []
  const orgPeople = personIds.map((personId) => {
    const person = retrievePerson(personId)
    return {
      id: personId,
      firstName: person.firstName,
      lastName: person.lastName,
      customerReference: person.customerReferenceNumber,
      confirmed: person.confirmed,
      lastUpdatedOn: person.lastUpdatedOn,
      role: person.role,
      privileges: person.privileges
    }
  })
  return orgPeople
}

export const lockOrganisation = (orgId) => {
  try {
    const org = retrieveOrganisation(orgId)

    // TODO: Uncomment this when we have a way to run prime contract tests in correct state
    // if (org.locked) {
    //   throw new Error(`organisation with orgId ${orgId} is already locked`)
    // }

    org.locked = true
  } catch (e) {
    // If not found or already locked, throw internal error to match upstream
    throw Boom.internal(e.message)
  }
}

export const unlockOrganisation = (orgId) => {
  try {
    const org = retrieveOrganisation(orgId)

    // TODO: Uncomment this when we have a way to run prime contract tests in correct state
    // if (!org.locked) {
    //   throw new Error(`organisation with orgId ${orgId} is already unlocked`)
    // }

    org.locked = false
  } catch (e) {
    // If not found or already unlocked, throw internal error to match upstream
    throw Boom.internal(e.message)
  }
}
