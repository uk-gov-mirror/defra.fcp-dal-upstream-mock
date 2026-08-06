import { faker, safeSeed } from '../common.js'

// The external-user function names the upstream recognises - mirrors AuthorisationData in
// src/routes/kits-v1/permissions-schema.oas.yml (a unit test keeps the two in sync).
export const KNOWN_FUNCTIONS = [
  'addOrRemoveOrTransferLand',
  'addRoleOrPrivilege',
  'amendApplication',
  'amendBankAccountDetails',
  'amendBusinessDetails',
  'amendControlledBusinessInfo',
  'amendELMApplications',
  'amendEntitlements',
  'amendLegallyResponsiblePeople',
  'amendNewYoungFarmerProcess',
  'applyForBPS',
  'closeBusiness',
  'confirmBusiness',
  'deleteBusiness',
  'modifyRoleOrPrivilege',
  'removeRoleOrPrivilege',
  'submitApplication',
  'submitELMApplications',
  'updateLandUse',
  'viewApplication',
  'viewBusinessBankAccount',
  'viewBusinessDetails',
  'viewCPH',
  'viewCSAgreements',
  'viewCSApplications',
  'viewCSClaims',
  'viewCountrysideStewardship',
  'viewELMApplications',
  'viewEntitlements',
  'viewLand',
  'viewLegallyResponsiblePeople'
]

const knownFunctions = new Set(KNOWN_FUNCTIONS)

export const retrieveAuthorisationByFunction = (orgId, functions) => {
  return functions.reduce((data, functionName) => {
    // The upstream echoes unrecognised function names back with a false.
    if (!knownFunctions.has(functionName)) {
      data[functionName] = false
      return data
    }
    // Seed per org+function so a function's flag is stable regardless of what else is requested.
    safeSeed([orgId, functionName])
    data[functionName] = faker.datatype.boolean()
    return data
  }, {})
}
