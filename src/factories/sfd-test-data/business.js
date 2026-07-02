/**
 * This file provides two lookups for the DAL mock:
 *
 * sfdBusinessDetailsLookup: orgId -> override object for business details (name, address, phones,
 * email). Entries are merged into staticBusinessData in id-lookups.js and applied as overrides in
 * organisation.factory.js. Only include the keys you need; other org fields come from factory defaults.
 *
 * sfdBusinessLookupCore: orgId -> { sbi, customers } (edge-case org existence + SBI + customer IDs).
 * The full sfdBusinessLookup (core + performance) is assembled in sfd-test-data/index.js and merged
 * into orgIdLookup in id-lookups.js. Business details come from sfdBusinessDetailsLookup above.
 *
 * Example shape for sfdBusinessDetailsLookup entries:
 *
 * {
 *   name: 'Business Name',
 *   address: {
 *     address1: 'Line 1',
 *     address2: null,
 *     address3: null,
 *     address4: 'Test County',
 *     address5: null,
 *     street: null,
 *     city: 'Test City',
 *     county: null,
 *     postalCode: 'AB1 2CD',
 *     country: 'United Kingdom',
 *     uprn: null  // Set to null for manual entry / test scenarios (no lookup)
 *   },
 *   landline: '01234567890',
 *   mobile: '07123456789',
 *   email: 'business@example.com'
 * }
 *
 * Org IDs follow the same numbering/buffer approach as personal.js: 100-org-ID buffer between
 * different scenario types; 10 examples per scenario.
 */
import { SHARED_TEST_ORG_PERSON_IDS } from './personal.js'

// SFD test data IDs — used in lookups below
// Single shared org used by many personal-details test users; see sharedTestOrgLookup.
const SHARED_TEST_ORG_ID = 3001458
// Main test person; added as customer to every business-details org so one user can access all.
const BUSINESS_DETAILS_TEST_PERSON_ID = 3009100
// First org in business-details range; used in SBI formula with BUSINESS_DETAILS_BASE_SBI.
const BUSINESS_DETAILS_BASE_ORG_ID = 3009000
// SBI for that base org; base value in the SBI formula for all business-details orgs.
const BUSINESS_DETAILS_BASE_SBI = 300900001
// Offset to add to org id to get SBI
const BASE_SBI_ORG_ID_OFFSET = BUSINESS_DETAILS_BASE_SBI - BUSINESS_DETAILS_BASE_ORG_ID
// Org with no CPH (holding number), for tests that need an org without a holding; see otherFixedOrgsLookup.
const ORG_ID_NO_CPH = 80000001

/*
 * Manual address only (no lookup): uprn is null; we do not use lookup data.
 *
 * Manual fields used:
 * - address1: Address line 1 (required). address2, address3, address5: optional lines (null if unused).
 * - address4: County (manual line 4 now stores county in this fixture mapping).
 * - postalCode, country: Required.
 *
 * Shared/lookup fields include city + county. For this mapping, city carries town/city and
 * address4 carries county while lookup-only fields (for example street) remain null.
 */

const minimalMandatoryAddress = {
  address1: '123 Test Street',
  address2: null,
  address3: null,
  address4: 'Test County',
  address5: null,
  street: null,
  city: 'Test City',
  county: null,
  postalCode: 'TE1 2ST',
  country: 'England',
  uprn: null
}

// Base applied to every org so address is predictable unless the entry overrides address.
const defaultBusinessDetailsOverride = { address: minimalMandatoryAddress }

// Shared constants
const addressLineTooLong = 'A'.repeat(101)
const phoneTooLong = '0'.repeat(51)
const emailTooLong = 'a'.repeat(250) + '@ab.com'

// Base templates
const cleanControlBase = {
  name: 'Clean control',
  landline: '01234567890',
  mobile: '07123456789',
  email: 'clean.business@example.com'
}

const addressLine1EmptyBase = {
  name: 'Address line 1 empty',
  address: { ...minimalMandatoryAddress, address1: '' }
}
const addressLine1TooLongBase = {
  name: 'Address line 1 too long',
  address: { ...minimalMandatoryAddress, address1: addressLineTooLong }
}
const addressLine2TooLongBase = {
  name: 'Address line 2 too long',
  address: { ...minimalMandatoryAddress, address2: addressLineTooLong }
}
const addressLine3TooLongBase = {
  name: 'Address line 3 too long',
  address: { ...minimalMandatoryAddress, address3: addressLineTooLong }
}
const cityEmptyBase = {
  name: 'City empty',
  address: { ...minimalMandatoryAddress, city: '' }
}
const cityTooLongBase = {
  name: 'City too long',
  address: { ...minimalMandatoryAddress, city: addressLineTooLong }
}
const countyTooLongBase = {
  name: 'County too long',
  address: { ...minimalMandatoryAddress, address4: addressLineTooLong }
}
const postcodeEmptyBase = {
  name: 'Postcode empty',
  address: { ...minimalMandatoryAddress, postalCode: '' }
}
const postcodeTooLongBase = {
  name: 'Postcode too long',
  address: { ...minimalMandatoryAddress, postalCode: addressLineTooLong }
}
const countryEmptyBase = {
  name: 'Country empty',
  address: { ...minimalMandatoryAddress, country: '' }
}
const countryTooLongBase = {
  name: 'Country too long',
  address: { ...minimalMandatoryAddress, country: addressLineTooLong }
}

const businessDetailsLookupEntries = {
  // Clean control - All valid data for comparison
  3009000: { ...cleanControlBase },
  3009001: { ...cleanControlBase },
  3009002: { ...cleanControlBase },
  3009003: { ...cleanControlBase },
  3009004: { ...cleanControlBase },
  3009005: { ...cleanControlBase },
  3009006: { ...cleanControlBase },
  3009007: { ...cleanControlBase },
  3009008: { ...cleanControlBase },
  3009009: { ...cleanControlBase },

  // Business name - null/empty + invalid
  // Name empty
  3009300: { ...addressLine1EmptyBase },
  3009301: { ...addressLine1EmptyBase },
  3009302: { ...addressLine1EmptyBase },
  3009303: { ...addressLine1EmptyBase },
  3009304: { ...addressLine1EmptyBase },
  3009305: { ...addressLine1EmptyBase },
  3009306: { ...addressLine1EmptyBase },
  3009307: { ...addressLine1EmptyBase },
  3009308: { ...addressLine1EmptyBase },
  3009309: { ...addressLine1EmptyBase },
  3009310: { ...addressLine1EmptyBase },

  // Address line 1 too long - ADDRESS_LINE_MAX 100
  3009400: { ...addressLine1TooLongBase },
  3009401: { ...addressLine1TooLongBase },
  3009402: { ...addressLine1TooLongBase },
  3009403: { ...addressLine1TooLongBase },
  3009404: { ...addressLine1TooLongBase },
  3009405: { ...addressLine1TooLongBase },
  3009406: { ...addressLine1TooLongBase },
  3009407: { ...addressLine1TooLongBase },
  3009408: { ...addressLine1TooLongBase },
  3009409: { ...addressLine1TooLongBase },

  // Address line 2 too long (10)
  3009500: { ...addressLine2TooLongBase },
  3009501: { ...addressLine2TooLongBase },
  3009502: { ...addressLine2TooLongBase },
  3009503: { ...addressLine2TooLongBase },
  3009504: { ...addressLine2TooLongBase },
  3009505: { ...addressLine2TooLongBase },
  3009506: { ...addressLine2TooLongBase },
  3009507: { ...addressLine2TooLongBase },
  3009508: { ...addressLine2TooLongBase },
  3009509: { ...addressLine2TooLongBase },

  // Address line 3 too long
  3009600: { ...addressLine3TooLongBase },
  3009601: { ...addressLine3TooLongBase },
  3009602: { ...addressLine3TooLongBase },
  3009603: { ...addressLine3TooLongBase },
  3009604: { ...addressLine3TooLongBase },
  3009605: { ...addressLine3TooLongBase },
  3009606: { ...addressLine3TooLongBase },
  3009607: { ...addressLine3TooLongBase },
  3009608: { ...addressLine3TooLongBase },
  3009609: { ...addressLine3TooLongBase },

  // City (shared) empty
  3009700: { ...cityEmptyBase },
  3009701: { ...cityEmptyBase },
  3009702: { ...cityEmptyBase },
  3009703: { ...cityEmptyBase },
  3009704: { ...cityEmptyBase },
  3009705: { ...cityEmptyBase },
  3009706: { ...cityEmptyBase },
  3009707: { ...cityEmptyBase },
  3009708: { ...cityEmptyBase },
  3009709: { ...cityEmptyBase },

  // City (shared) too long - TOWN_CITY_MAX 60
  3009800: { ...cityTooLongBase },
  3009801: { ...cityTooLongBase },
  3009802: { ...cityTooLongBase },
  3009803: { ...cityTooLongBase },
  3009804: { ...cityTooLongBase },
  3009805: { ...cityTooLongBase },
  3009806: { ...cityTooLongBase },
  3009807: { ...cityTooLongBase },
  3009808: { ...cityTooLongBase },
  3009809: { ...cityTooLongBase },

  // County too long - COUNTY_MAX 60
  3009900: { ...countyTooLongBase },
  3009901: { ...countyTooLongBase },
  3009902: { ...countyTooLongBase },
  3009903: { ...countyTooLongBase },
  3009904: { ...countyTooLongBase },
  3009905: { ...countyTooLongBase },
  3009906: { ...countyTooLongBase },
  3009907: { ...countyTooLongBase },
  3009908: { ...countyTooLongBase },
  3009909: { ...countyTooLongBase },

  // Postcode empty
  3010000: { ...postcodeEmptyBase },
  3010001: { ...postcodeEmptyBase },
  3010002: { ...postcodeEmptyBase },
  3010003: { ...postcodeEmptyBase },
  3010004: { ...postcodeEmptyBase },
  3010005: { ...postcodeEmptyBase },
  3010006: { ...postcodeEmptyBase },
  3010007: { ...postcodeEmptyBase },
  3010008: { ...postcodeEmptyBase },
  3010009: { ...postcodeEmptyBase },

  // Postcode too long - POSTCODE_MAX 8
  3010100: { ...postcodeTooLongBase },
  3010101: { ...postcodeTooLongBase },
  3010102: { ...postcodeTooLongBase },
  3010103: { ...postcodeTooLongBase },
  3010104: { ...postcodeTooLongBase },
  3010105: { ...postcodeTooLongBase },
  3010106: { ...postcodeTooLongBase },
  3010107: { ...postcodeTooLongBase },
  3010108: { ...postcodeTooLongBase },
  3010109: { ...postcodeTooLongBase },

  // Country empty
  3010200: { ...countryEmptyBase },
  3010201: { ...countryEmptyBase },
  3010202: { ...countryEmptyBase },
  3010203: { ...countryEmptyBase },
  3010204: { ...countryEmptyBase },
  3010205: { ...countryEmptyBase },
  3010206: { ...countryEmptyBase },
  3010207: { ...countryEmptyBase },
  3010208: { ...countryEmptyBase },
  3010209: { ...countryEmptyBase },

  // Country too long - COUNTRY_MAX 60
  3010300: { ...countryTooLongBase },
  3010301: { ...countryTooLongBase },
  3010302: { ...countryTooLongBase },
  3010303: { ...countryTooLongBase },
  3010304: { ...countryTooLongBase },
  3010305: { ...countryTooLongBase },
  3010306: { ...countryTooLongBase },
  3010307: { ...countryTooLongBase },
  3010308: { ...countryTooLongBase },
  3010309: { ...countryTooLongBase },

  // Phone - both null
  3010400: { name: 'Both phones null - example 1', landline: null, mobile: null },
  3010401: { name: 'Both phones null - example 2', landline: null, mobile: null },
  3010402: { name: 'Both phones null - example 3', landline: null, mobile: null },
  3010403: { name: 'Both phones null - example 4', landline: null, mobile: null },
  3010404: { name: 'Both phones null - example 5', landline: null, mobile: null },
  3010405: { name: 'Both phones null - example 6', landline: null, mobile: null },
  3010406: { name: 'Both phones null - example 7', landline: null, mobile: null },
  3010407: { name: 'Both phones null - example 8', landline: null, mobile: null },
  3010408: { name: 'Both phones null - example 9', landline: null, mobile: null },
  3010409: { name: 'Both phones null - example 10', landline: null, mobile: null },

  // Landline too short - PHONE_NUMBER_MIN 10
  3010500: { name: 'Landline too short - example 1', landline: '123' },
  3010501: { name: 'Landline too short - example 2', landline: '123' },
  3010502: { name: 'Landline too short - example 3', landline: '123' },
  3010503: { name: 'Landline too short - example 4', landline: '123' },
  3010504: { name: 'Landline too short - example 5', landline: '123' },
  3010505: { name: 'Landline too short - example 6', landline: '123' },
  3010506: { name: 'Landline too short - example 7', landline: '123' },
  3010507: { name: 'Landline too short - example 8', landline: '123' },
  3010508: { name: 'Landline too short - example 9', landline: '123' },
  3010509: { name: 'Landline too short - example 10', landline: '123' },

  // Landline too long - PHONE_NUMBER_MAX 50
  3010600: { name: 'Landline too long - example 1', landline: phoneTooLong },
  3010601: { name: 'Landline too long - example 2', landline: phoneTooLong },
  3010602: { name: 'Landline too long - example 3', landline: phoneTooLong },
  3010603: { name: 'Landline too long - example 4', landline: phoneTooLong },
  3010604: { name: 'Landline too long - example 5', landline: phoneTooLong },
  3010605: { name: 'Landline too long - example 6', landline: phoneTooLong },
  3010606: { name: 'Landline too long - example 7', landline: phoneTooLong },
  3010607: { name: 'Landline too long - example 8', landline: phoneTooLong },
  3010608: { name: 'Landline too long - example 9', landline: phoneTooLong },
  3010609: { name: 'Landline too long - example 10', landline: phoneTooLong },

  // Mobile too short
  3010700: { name: 'Mobile too short - example 1', mobile: '123' },
  3010701: { name: 'Mobile too short - example 2', mobile: '123' },
  3010702: { name: 'Mobile too short - example 3', mobile: '123' },
  3010703: { name: 'Mobile too short - example 4', mobile: '123' },
  3010704: { name: 'Mobile too short - example 5', mobile: '123' },
  3010705: { name: 'Mobile too short - example 6', mobile: '123' },
  3010706: { name: 'Mobile too short - example 7', mobile: '123' },
  3010707: { name: 'Mobile too short - example 8', mobile: '123' },
  3010708: { name: 'Mobile too short - example 9', mobile: '123' },
  3010709: { name: 'Mobile too short - example 10', mobile: '123' },

  // Mobile too long
  3010800: { name: 'Mobile too long - example 1', mobile: phoneTooLong },
  3010801: { name: 'Mobile too long - example 2', mobile: phoneTooLong },
  3010802: { name: 'Mobile too long - example 3', mobile: phoneTooLong },
  3010803: { name: 'Mobile too long - example 4', mobile: phoneTooLong },
  3010804: { name: 'Mobile too long - example 5', mobile: phoneTooLong },
  3010805: { name: 'Mobile too long - example 6', mobile: phoneTooLong },
  3010806: { name: 'Mobile too long - example 7', mobile: phoneTooLong },
  3010807: { name: 'Mobile too long - example 8', mobile: phoneTooLong },
  3010808: { name: 'Mobile too long - example 9', mobile: phoneTooLong },
  3010809: { name: 'Mobile too long - example 10', mobile: phoneTooLong },

  // Invalid business phone - Invalid phone formats
  // Invalid phone 'not-a-phone'
  3011000: { name: 'Invalid phone not-a-phone - example 1', mobile: 'not-a-phone' },
  3011001: { name: 'Invalid phone not-a-phone - example 2', mobile: 'not-a-phone' },
  3011002: { name: 'Invalid phone not-a-phone - example 3', mobile: 'not-a-phone' },
  3011003: { name: 'Invalid phone not-a-phone - example 4', mobile: 'not-a-phone' },
  3011004: { name: 'Invalid phone not-a-phone - example 5', mobile: 'not-a-phone' },
  3011005: { name: 'Invalid phone not-a-phone - example 6', mobile: 'not-a-phone' },
  3011006: { name: 'Invalid phone not-a-phone - example 7', mobile: 'not-a-phone' },
  3011007: { name: 'Invalid phone not-a-phone - example 8', mobile: 'not-a-phone' },
  3011008: { name: 'Invalid phone not-a-phone - example 9', mobile: 'not-a-phone' },
  3011009: { name: 'Invalid phone not-a-phone - example 10', mobile: 'not-a-phone' },
  // Too short
  3011100: { name: 'Invalid phone too short - example 1', mobile: '123' },
  3011101: { name: 'Invalid phone too short - example 2', mobile: '123' },
  3011102: { name: 'Invalid phone too short - example 3', mobile: '123' },
  3011103: { name: 'Invalid phone too short - example 4', mobile: '123' },
  3011104: { name: 'Invalid phone too short - example 5', mobile: '123' },
  3011105: { name: 'Invalid phone too short - example 6', mobile: '123' },
  3011106: { name: 'Invalid phone too short - example 7', mobile: '123' },
  3011107: { name: 'Invalid phone too short - example 8', mobile: '123' },
  3011108: { name: 'Invalid phone too short - example 9', mobile: '123' },
  3011109: { name: 'Invalid phone too short - example 10', mobile: '123' },
  // Contains letters
  3011200: { name: 'Invalid phone contains letters - example 1', mobile: 'abc-def-ghij' },
  3011201: { name: 'Invalid phone contains letters - example 2', mobile: 'abc-def-ghij' },
  3011202: { name: 'Invalid phone contains letters - example 3', mobile: 'abc-def-ghij' },
  3011203: { name: 'Invalid phone contains letters - example 4', mobile: 'abc-def-ghij' },
  3011204: { name: 'Invalid phone contains letters - example 5', mobile: 'abc-def-ghij' },
  3011205: { name: 'Invalid phone contains letters - example 6', mobile: 'abc-def-ghij' },
  3011206: { name: 'Invalid phone contains letters - example 7', mobile: 'abc-def-ghij' },
  3011207: { name: 'Invalid phone contains letters - example 8', mobile: 'abc-def-ghij' },
  3011208: { name: 'Invalid phone contains letters - example 9', mobile: 'abc-def-ghij' },
  3011209: { name: 'Invalid phone contains letters - example 10', mobile: 'abc-def-ghij' },
  // Special characters only
  3011300: { name: 'Invalid phone special chars - example 1', mobile: '!@#$%^&*()' },
  3011301: { name: 'Invalid phone special chars - example 2', mobile: '!@#$%^&*()' },
  3011302: { name: 'Invalid phone special chars - example 3', mobile: '!@#$%^&*()' },
  3011303: { name: 'Invalid phone special chars - example 4', mobile: '!@#$%^&*()' },
  3011304: { name: 'Invalid phone special chars - example 5', mobile: '!@#$%^&*()' },
  3011305: { name: 'Invalid phone special chars - example 6', mobile: '!@#$%^&*()' },
  3011306: { name: 'Invalid phone special chars - example 7', mobile: '!@#$%^&*()' },
  3011307: { name: 'Invalid phone special chars - example 8', mobile: '!@#$%^&*()' },
  3011308: { name: 'Invalid phone special chars - example 9', mobile: '!@#$%^&*()' },
  3011309: { name: 'Invalid phone special chars - example 10', mobile: '!@#$%^&*()' },
  // Empty string
  3011400: { name: 'Invalid phone empty string - example 1', mobile: '' },
  3011401: { name: 'Invalid phone empty string - example 2', mobile: '' },
  3011402: { name: 'Invalid phone empty string - example 3', mobile: '' },
  3011403: { name: 'Invalid phone empty string - example 4', mobile: '' },
  3011404: { name: 'Invalid phone empty string - example 5', mobile: '' },
  3011405: { name: 'Invalid phone empty string - example 6', mobile: '' },
  3011406: { name: 'Invalid phone empty string - example 7', mobile: '' },
  3011407: { name: 'Invalid phone empty string - example 8', mobile: '' },
  3011408: { name: 'Invalid phone empty string - example 9', mobile: '' },
  3011409: { name: 'Invalid phone empty string - example 10', mobile: '' },
  // Spaces only
  3011500: { name: 'Invalid phone spaces only - example 1', mobile: '   ' },
  3011501: { name: 'Invalid phone spaces only - example 2', mobile: '   ' },
  3011502: { name: 'Invalid phone spaces only - example 3', mobile: '   ' },
  3011503: { name: 'Invalid phone spaces only - example 4', mobile: '   ' },
  3011504: { name: 'Invalid phone spaces only - example 5', mobile: '   ' },
  3011505: { name: 'Invalid phone spaces only - example 6', mobile: '   ' },
  3011506: { name: 'Invalid phone spaces only - example 7', mobile: '   ' },
  3011507: { name: 'Invalid phone spaces only - example 8', mobile: '   ' },
  3011508: { name: 'Invalid phone spaces only - example 9', mobile: '   ' },
  3011509: { name: 'Invalid phone spaces only - example 10', mobile: '   ' },
  // Wrong format
  3011600: { name: 'Invalid phone wrong format - example 1', mobile: '123-45' },
  3011601: { name: 'Invalid phone wrong format - example 2', mobile: '123-45' },
  3011602: { name: 'Invalid phone wrong format - example 3', mobile: '123-45' },
  3011603: { name: 'Invalid phone wrong format - example 4', mobile: '123-45' },
  3011604: { name: 'Invalid phone wrong format - example 5', mobile: '123-45' },
  3011605: { name: 'Invalid phone wrong format - example 6', mobile: '123-45' },
  3011606: { name: 'Invalid phone wrong format - example 7', mobile: '123-45' },
  3011607: { name: 'Invalid phone wrong format - example 8', mobile: '123-45' },
  3011608: { name: 'Invalid phone wrong format - example 9', mobile: '123-45' },
  3011609: { name: 'Invalid phone wrong format - example 10', mobile: '123-45' },
  // Mixed invalid (letters and numbers)
  3011700: { name: 'Invalid phone mixed invalid - example 1', mobile: '12abc34' },
  3011701: { name: 'Invalid phone mixed invalid - example 2', mobile: '12abc34' },
  3011702: { name: 'Invalid phone mixed invalid - example 3', mobile: '12abc34' },
  3011703: { name: 'Invalid phone mixed invalid - example 4', mobile: '12abc34' },
  3011704: { name: 'Invalid phone mixed invalid - example 5', mobile: '12abc34' },
  3011705: { name: 'Invalid phone mixed invalid - example 6', mobile: '12abc34' },
  3011706: { name: 'Invalid phone mixed invalid - example 7', mobile: '12abc34' },
  3011707: { name: 'Invalid phone mixed invalid - example 8', mobile: '12abc34' },
  3011708: { name: 'Invalid phone mixed invalid - example 9', mobile: '12abc34' },
  3011709: { name: 'Invalid phone mixed invalid - example 10', mobile: '12abc34' },
  // Too long
  3011800: { name: 'Invalid phone too long - example 1', mobile: '12345678901234567890' },
  3011801: { name: 'Invalid phone too long - example 2', mobile: '12345678901234567890' },
  3011802: { name: 'Invalid phone too long - example 3', mobile: '12345678901234567890' },
  3011803: { name: 'Invalid phone too long - example 4', mobile: '12345678901234567890' },
  3011804: { name: 'Invalid phone too long - example 5', mobile: '12345678901234567890' },
  3011805: { name: 'Invalid phone too long - example 6', mobile: '12345678901234567890' },
  3011806: { name: 'Invalid phone too long - example 7', mobile: '12345678901234567890' },
  3011807: { name: 'Invalid phone too long - example 8', mobile: '12345678901234567890' },
  3011808: { name: 'Invalid phone too long - example 9', mobile: '12345678901234567890' },
  3011809: { name: 'Invalid phone too long - example 10', mobile: '12345678901234567890' },
  // Null as string
  3011900: { name: 'Invalid phone null as string - example 1', mobile: 'null' },
  3011901: { name: 'Invalid phone null as string - example 2', mobile: 'null' },
  3011902: { name: 'Invalid phone null as string - example 3', mobile: 'null' },
  3011903: { name: 'Invalid phone null as string - example 4', mobile: 'null' },
  3011904: { name: 'Invalid phone null as string - example 5', mobile: 'null' },
  3011905: { name: 'Invalid phone null as string - example 6', mobile: 'null' },
  3011906: { name: 'Invalid phone null as string - example 7', mobile: 'null' },
  3011907: { name: 'Invalid phone null as string - example 8', mobile: 'null' },
  3011908: { name: 'Invalid phone null as string - example 9', mobile: 'null' },
  3011909: { name: 'Invalid phone null as string - example 10', mobile: 'null' },

  // Email - null/empty + invalid
  // Email empty
  3012000: { name: 'Email empty - example 1', email: '' },
  3012001: { name: 'Email empty - example 2', email: '' },
  3012002: { name: 'Email empty - example 3', email: '' },
  3012003: { name: 'Email empty - example 4', email: '' },
  3012004: { name: 'Email empty - example 5', email: '' },
  3012005: { name: 'Email empty - example 6', email: '' },
  3012006: { name: 'Email empty - example 7', email: '' },
  3012007: { name: 'Email empty - example 8', email: '' },
  3012008: { name: 'Email empty - example 9', email: '' },
  3012009: { name: 'Email empty - example 10', email: '' },

  // Email too long - EMAIL_MAX 254
  3012100: { name: 'Email too long - example 1', email: emailTooLong },
  3012101: { name: 'Email too long - example 2', email: emailTooLong },
  3012102: { name: 'Email too long - example 3', email: emailTooLong },
  3012103: { name: 'Email too long - example 4', email: emailTooLong },
  3012104: { name: 'Email too long - example 5', email: emailTooLong },
  3012105: { name: 'Email too long - example 6', email: emailTooLong },
  3012106: { name: 'Email too long - example 7', email: emailTooLong },
  3012107: { name: 'Email too long - example 8', email: emailTooLong },
  3012108: { name: 'Email too long - example 9', email: emailTooLong },
  3012109: { name: 'Email too long - example 10', email: emailTooLong },

  // Email invalid format
  3012200: { name: 'Email invalid format - example 1', email: 'not-an-email' },
  3012201: { name: 'Email invalid format - example 2', email: 'not-an-email' },
  3012202: { name: 'Email invalid format - example 3', email: 'a@b' },
  3012203: { name: 'Email invalid format - example 4', email: 'a@b' },
  3012204: { name: 'Email invalid format - example 5', email: 'missing-at.com' },
  3012205: { name: 'Email invalid format - example 6', email: 'missing-at.com' },
  3012206: { name: 'Email invalid format - example 7', email: '@nodomain.co' },
  3012207: { name: 'Email invalid format - example 8', email: '@nodomain.co' },
  3012208: { name: 'Email invalid format - example 9', email: 'nodot@domain' },
  3012209: { name: 'Email invalid format - example 10', email: 'nodot@domain' },

  // Combined invalid - multiple sections invalid per org for interrupter journey
  // Address + phone invalid
  3012300: {
    name: 'Address + phone invalid - example 1',
    address: { ...minimalMandatoryAddress, address1: '' },
    landline: null,
    mobile: null
  },
  3012301: {
    name: 'Address + phone invalid - example 2',
    address: { ...minimalMandatoryAddress, address1: '' },
    landline: null,
    mobile: null
  },
  3012302: {
    name: 'Address + phone invalid - example 3',
    address: { ...minimalMandatoryAddress, address1: '' },
    landline: null,
    mobile: null
  },
  3012303: {
    name: 'Address + phone invalid - example 4',
    address: { ...minimalMandatoryAddress, address1: '' },
    landline: null,
    mobile: null
  },
  3012304: {
    name: 'Address + phone invalid - example 5',
    address: { ...minimalMandatoryAddress, address1: '' },
    landline: null,
    mobile: null
  },
  3012305: {
    name: 'Address + phone invalid - example 6',
    address: { ...minimalMandatoryAddress, address1: '' },
    landline: null,
    mobile: null
  },
  3012306: {
    name: 'Address + phone invalid - example 7',
    address: { ...minimalMandatoryAddress, address1: '' },
    landline: null,
    mobile: null
  },
  3012307: {
    name: 'Address + phone invalid - example 8',
    address: { ...minimalMandatoryAddress, address1: '' },
    landline: null,
    mobile: null
  },
  3012308: {
    name: 'Address + phone invalid - example 9',
    address: { ...minimalMandatoryAddress, address1: '' },
    landline: null,
    mobile: null
  },
  3012309: {
    name: 'Address + phone invalid - example 10',
    address: { ...minimalMandatoryAddress, address1: '' },
    landline: null,
    mobile: null
  },
  // Address + email invalid
  3012400: {
    name: 'Address + email invalid - example 1',
    address: { ...minimalMandatoryAddress, address1: '' },
    email: 'not-an-email'
  },
  3012401: {
    name: 'Address + email invalid - example 2',
    address: { ...minimalMandatoryAddress, address1: '' },
    email: 'not-an-email'
  },
  3012402: {
    name: 'Address + email invalid - example 3',
    address: { ...minimalMandatoryAddress, address1: '' },
    email: 'not-an-email'
  },
  3012403: {
    name: 'Address + email invalid - example 4',
    address: { ...minimalMandatoryAddress, address1: '' },
    email: 'not-an-email'
  },
  3012404: {
    name: 'Address + email invalid - example 5',
    address: { ...minimalMandatoryAddress, address1: '' },
    email: 'not-an-email'
  },
  3012405: {
    name: 'Address + email invalid - example 6',
    address: { ...minimalMandatoryAddress, address1: '' },
    email: 'not-an-email'
  },
  3012406: {
    name: 'Address + email invalid - example 7',
    address: { ...minimalMandatoryAddress, address1: '' },
    email: 'not-an-email'
  },
  3012407: {
    name: 'Address + email invalid - example 8',
    address: { ...minimalMandatoryAddress, address1: '' },
    email: 'not-an-email'
  },
  3012408: {
    name: 'Address + email invalid - example 9',
    address: { ...minimalMandatoryAddress, address1: '' },
    email: 'not-an-email'
  },
  3012409: {
    name: 'Address + email invalid - example 10',
    address: { ...minimalMandatoryAddress, address1: '' },
    email: 'not-an-email'
  },
  // Phone + email invalid
  3012500: {
    name: 'Phone + email invalid - example 1',
    mobile: 'not-a-phone',
    email: 'not-an-email'
  },
  3012501: {
    name: 'Phone + email invalid - example 2',
    mobile: 'not-a-phone',
    email: 'not-an-email'
  },
  3012502: {
    name: 'Phone + email invalid - example 3',
    mobile: 'not-a-phone',
    email: 'not-an-email'
  },
  3012503: {
    name: 'Phone + email invalid - example 4',
    mobile: 'not-a-phone',
    email: 'not-an-email'
  },
  3012504: {
    name: 'Phone + email invalid - example 5',
    mobile: 'not-a-phone',
    email: 'not-an-email'
  },
  3012505: {
    name: 'Phone + email invalid - example 6',
    mobile: 'not-a-phone',
    email: 'not-an-email'
  },
  3012506: {
    name: 'Phone + email invalid - example 7',
    mobile: 'not-a-phone',
    email: 'not-an-email'
  },
  3012507: {
    name: 'Phone + email invalid - example 8',
    mobile: 'not-a-phone',
    email: 'not-an-email'
  },
  3012508: {
    name: 'Phone + email invalid - example 9',
    mobile: 'not-a-phone',
    email: 'not-an-email'
  },
  3012509: {
    name: 'Phone + email invalid - example 10',
    mobile: 'not-a-phone',
    email: 'not-an-email'
  },
  // All three invalid - address + phone + email
  3012600: {
    name: 'All three invalid - example 1',
    address: { ...minimalMandatoryAddress, address1: '' },
    landline: null,
    mobile: null,
    email: 'not-an-email'
  },
  3012601: {
    name: 'All three invalid - example 2',
    address: { ...minimalMandatoryAddress, address1: '' },
    landline: null,
    mobile: null,
    email: 'not-an-email'
  },
  3012602: {
    name: 'All three invalid - example 3',
    address: { ...minimalMandatoryAddress, address1: '' },
    landline: null,
    mobile: null,
    email: 'not-an-email'
  },
  3012603: {
    name: 'All three invalid - example 4',
    address: { ...minimalMandatoryAddress, address1: '' },
    landline: null,
    mobile: null,
    email: 'not-an-email'
  },
  3012604: {
    name: 'All three invalid - example 5',
    address: { ...minimalMandatoryAddress, address1: '' },
    landline: null,
    mobile: null,
    email: 'not-an-email'
  },
  3012605: {
    name: 'All three invalid - example 6',
    address: { ...minimalMandatoryAddress, address1: '' },
    landline: null,
    mobile: null,
    email: 'not-an-email'
  },
  3012606: {
    name: 'All three invalid - example 7',
    address: { ...minimalMandatoryAddress, address1: '' },
    landline: null,
    mobile: null,
    email: 'not-an-email'
  },
  3012607: {
    name: 'All three invalid - example 8',
    address: { ...minimalMandatoryAddress, address1: '' },
    landline: null,
    mobile: null,
    email: 'not-an-email'
  },
  3012608: {
    name: 'All three invalid - example 9',
    address: { ...minimalMandatoryAddress, address1: '' },
    landline: null,
    mobile: null,
    email: 'not-an-email'
  },
  3012609: {
    name: 'All three invalid - example 10',
    address: { ...minimalMandatoryAddress, address1: '' },
    landline: null,
    mobile: null,
    email: 'not-an-email'
  }
}

/*
 * Without this merge, any entry that does not set address would get a faker-generated
 * address from the organisation factory, which is unpredictable and can cause missing address
 * lines or frontend validation failures. We want every such org to get the deterministic
 * minimalMandatoryAddress instead.
 *
 * businessDetailsLookupEntries lists only what each org overrides (name, address when
 * needed, phones, email). We merge defaultBusinessDetailsOverride (which sets
 * address: minimalMandatoryAddress) into each entry here. Entries that omit address get the
 * default; entries that set address (e.g. addressTownEmpty, address1 too long) override it.
 */
export const sfdBusinessDetailsLookup = Object.fromEntries(
  Object.entries(businessDetailsLookupEntries).map(([id, entry]) => [
    id,
    { ...defaultBusinessDetailsOverride, ...entry }
  ])
)

/*
 * Org/customer lookup: which orgs exist and who their "customers" are (person IDs).
 *
 * What: This data is the "org existence + SBI + customers" lookup. Each entry is
 * orgId -> { sbi, customers }. It does not hold business details (name, address, phones,
 * email); those come from sfdBusinessDetailsLookup.
 *
 * Where used: Merged into orgIdLookup in id-lookups.js, which drives orgIdToSbi and
 * orgIdToPersonIds (and thus "which orgs exist" and "who are the customers of this org?").
 *
 * Why three parts: (1) Shared Test Org — one org (3001458) shared by many personal-details
 * test users. (2) Business-details orgs — one org per sfdBusinessDetailsLookup entry, each
 * with customer 3009100. (3) Other fixed orgs — e.g. org with no CPH for tests.
 *
 * Sync rule: Customers for the shared Test Org (3001458) are derived in personal.js
 * (SHARED_TEST_ORG_PERSON_IDS = sfdPersonLookup keys except 3009100). When adding a new test user
 * with org 3001458 in defra-id, add their person ID to sfdPersonLookup in personal.js; they appear
 * in SHARED_TEST_ORG_PERSON_IDS automatically.
 */

const sharedTestOrgLookup = {
  [SHARED_TEST_ORG_ID]: {
    sbi: 300145801,
    customers: SHARED_TEST_ORG_PERSON_IDS
  }
}

// Permission-level test users (dedicated block 3011000–3011026 in personal.js):
// view 3011010–3011011, amend valid 3011012–3011016, amend one invalid 3011017–3011026, amend two invalid 3011000–3011009.
const PERMISSION_TEST_VIEW_PERSON_IDS = [3011010, 3011011]
const PERMISSION_TEST_AMEND_VALID_PERSON_IDS = [3011012, 3011013, 3011014, 3011015, 3011016]

// Orgs that have additional permission-test users as customers
const permissionUsersByOrgId = {
  3009000: [...PERMISSION_TEST_VIEW_PERSON_IDS, ...PERMISSION_TEST_AMEND_VALID_PERSON_IDS],
  3009001: PERMISSION_TEST_AMEND_VALID_PERSON_IDS,
  3009002: PERMISSION_TEST_AMEND_VALID_PERSON_IDS,
  3009003: PERMISSION_TEST_AMEND_VALID_PERSON_IDS,
  3009004: PERMISSION_TEST_AMEND_VALID_PERSON_IDS,
  3009300: [3011017],
  3009400: [3011018],
  3009500: [3011019],
  3009600: [3011020],
  3009700: [3011021],
  3009800: [3011022],
  3009900: [3011023],
  3010000: [3011024],
  3010100: [3011025],
  3010200: [3011026],
  3012300: [3011000],
  3012301: [3011001],
  3012302: [3011002],
  3012400: [3011003],
  3012401: [3011004],
  3012500: [3011005],
  3012501: [3011006],
  3012600: [3011007],
  3012601: [3011008],
  3012303: [3011009]
}

/*
 * Build a lookup: for each test org we store its SBI, which test users can access it, and business-details overrides.
 * - SBI is derived as BASE_SBI_ORG_ID_OFFSET + org id.
 * - overrides (name, address, phones, email) are passed through to orgIdLookup and applied in organisation.factory.js.
 * - Org BUSINESS_DETAILS_BASE_ORG_ID has view + amend-valid permission-test users; 3009001–3009004 have amend-valid.
 * - One-invalid orgs (3009300, 3009400, …) and two-invalid orgs (3012300, 3012400, …) have the
 *   corresponding amend permission-test users as customers.
 * - All business-details orgs include 3009100 so the main test user keeps access to all orgs.
 */
const businessDetailsOrgLookup = Object.fromEntries(
  Object.entries(sfdBusinessDetailsLookup).map(([orgId, overrides]) => {
    const id = Number(orgId)
    const permissionUsers = permissionUsersByOrgId[id] ?? []
    return [
      id,
      {
        sbi: BASE_SBI_ORG_ID_OFFSET + id,
        customers: [BUSINESS_DETAILS_TEST_PERSON_ID, ...permissionUsers],
        overrides
      }
    ]
  })
)

// Other fixed orgs (e.g. org with no CPH for tests).
const otherFixedOrgsLookup = {
  [ORG_ID_NO_CPH]: { sbi: 800000001, customers: [8000001], cphs: [] }
}

export const sfdBusinessLookupCore = {
  ...sharedTestOrgLookup,
  ...businessDetailsOrgLookup,
  ...otherFixedOrgsLookup
}
