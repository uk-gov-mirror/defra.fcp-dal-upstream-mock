#!/usr/bin/env bash
set -e

# setup
baseDir=`cd $(dirname $0) ; pwd`
cd $baseDir
rootDir=`cd ../.. ; pwd`
mkdir -p ./tmp

usage() {
  set +x
  echo
  echo "Run schemathesis contract tests against the upstream KITS."
  echo "All tests are run against the 'upgrade' API env."
  echo
  echo "Usage: $0 {a|auth|authenticate|b|bank|o|org|organisation|p|person|r|rd|reference-data|s|sa|siti-agri|help}"
  echo
  echo "Where the argument specifies which schema to test:"
  echo "  a  | auth | authenticate - test the Authenticate schema"
  echo "  b  | bank                - test the Bank Change Service schema"
  echo "  l  | land                - test the Land schema"
  echo "  o  | org | organisation  - test the Organisation schema"
  echo "  p  | person              - test the Person schema"
  echo "  r  | rd | reference-data - test the Reference Data schema"
  echo "  pd | payments            - test the Payment Details schema"
  echo "  s  | sa | siti-agri      - test the Siti-Agri schema"
  echo "  h  | help                - show this help message"
  echo
  echo "NOTE: additionally the following environment variables must be set:"
  echo "  CDP_API_KEY - CDP Platform developer API key "
  echo "  KITS_URL  - the URL of the KITS API to use (this should be the DAL Mock proxy endpoint, via the ephemeral endpoint)"
  echo "or..."
  echo "  HITACHI_CLIENT_SECRET - the client secret for token generation"
}

# check OPTION argument
kits=false
case "$1" in
  h | help | --help | -h )
    usage
    exit 0
    ;;
  # KITS APIs
  b | bank )
    schema="kits-v1/bank"
    mutations='. |
.components.schemas.SubmissionRequest.examples[0].organisationId = "5583781" |
.components.schemas.SubmissionRequest.examples[0].personId = "5020949" |
.components.schemas.SubmissionRequest.examples[0].sbi = "110405990" |
.components.schemas.SubmissionRequest.examples[0].frn = "10014489653" |
.components.schemas.SubmissionRequest.examples[0].crn = "1100209492" |
.components.schemas.SubmissionRequest.properties.organisationId.enum = ["5583781"] |
.components.schemas.SubmissionRequest.properties.personId.enum = ["5020949"] |
.components.schemas.ValidateRequest.examples[0].sbi = "110405990" |
.components.schemas.ValidateRequest.examples[0].frn = "10014489653" |
.components.schemas.ValidateRequest.examples[0].crn = "1100209492" |
.paths["/bank-change-service/v1/locked-status/{organisationId}/{personId}"].get.parameters[0].schema.examples = ["5583781"] |
.paths["/bank-change-service/v1/locked-status/{organisationId}/{personId}"].get.parameters[1].schema.examples = ["5020949"] |
.paths["/bank-change-service/v1/account-status/{organisationId}"].get.parameters[0].schema.examples = ["5583781"] |
.paths["/bank-change-service/v1/existing-accounts/{frn}"].get.parameters[0].schema.examples = ["10014489653"]'
    kits=true
    ;;
  a | auth | authenticate )
    schema="kits-v1/authenticate"
    mutations='. |
.paths["/external-auth/security-answers/{crn}"].get.parameters[0].schema.examples = [1105739979,1106046692,1106077237,1100932879,1105430162]'
    kits=true
    ;;
  l | land )
    schema="kits-v1/land"
    mutations='. |
.components.parameters.organisationId.schema.examples = [5588135] |
.components.parameters.sheetId.schema.examples = ["TL8951"] |
.components.parameters.parcelId.schema.examples = ["3227"] |
.components.parameters.historicDate.schema.examples = ["19-Jul-24"] |
.paths["/lms/organisation/{organisationId}/parcel/sheet-id/{sheetId}/parcel-id/{parcelId}/historic/{historicDate}/land-covers"].get.parameters[4].schema.examples = [true, false]'
    kits=true
    ;;
  o | org | organisation )
    schema="kits-v1/organisation"
    mutations='. |
.paths["/organisation/{organisationId}"].get.parameters[0].schema.examples = [5849659,5852711,5858233 ] |
.components.schemas.SearchRequestBody.examples[0].primarySearchPhrase = "106554744" |
.components.schemas.SearchRequestBody.examples[1].primarySearchPhrase = "200629003" |
.components.schemas.SearchRequestBody.examples[2].primarySearchPhrase = "200665008" |
.components.schemas.SearchRequestBody.examples[3].primarySearchPhrase = "Wood" |
.components.schemas.SearchRequestBody.examples[4].primarySearchPhrase = "YO18 8RL" |
.paths["/organisation/{organisationId}/lock"].post.parameters[0].schema.examples = [5583781,5849659,5852711,5858233] |
.paths["/organisation/{organisationId}/unlock"].post.parameters[0].schema.examples = [5583781,5849659,5852711,5858233]'
    kits=true
    ;;
  p | person )
    schema="kits-v1/person"
    mutations='. |
.paths["/person/{personId}/summary"].get.parameters[0].schema.examples = [5858232,5108985,5108989] |
.components.schemas.SearchRequestBody.examples[0].primarySearchPhrase = "1105658066" |
.components.schemas.SearchRequestBody.examples[1].primarySearchPhrase = "1101089857" |
.components.schemas.SearchRequestBody.examples[2].primarySearchPhrase = "1101089899" |
.components.schemas.SearchRequestBody.examples[3].primarySearchPhrase = "116172867" |
.components.schemas.SearchRequestBody.examples[4].primarySearchPhrase = "Truelove" |
.components.schemas.SearchRequestBody.examples[5].primarySearchPhrase = "EX14 2XA" |
.components.schemas.SearchRequestBody.examples[6].primarySearchPhrase = "123456" |
.components.schemas.SearchRequestBody.examples[7].primarySearchPhrase = "123456"'
    kits=true
    ;;
  r | rd | reference-data )
    schema="kits-v1/reference-data"
    mutations='.'
    kits=true
    ;;
  s | sa | siti-agri )
    schema="kits-v1/siti-agri"
    mutations='. |
.paths["/SitiAgriApi/cv/appByBusiness/sbi/{sbi}/list"].get.parameters[0].schema.examples = [121174131,200697200,107120488,117713636,200694241,200721391,119897756] |
.paths["/SitiAgriApi/cv/agreementsByBusiness/sbi/{sbi}/list"].get.parameters[0].schema.examples = [107183280,200697200,107120488,117713636,200694241] |
.paths["/SitiAgriApi/cv/cphByBusiness/sbi/{sbi}/list"].get.parameters[0].schema.examples = [121174131,200697200,107120488,117713636,200694241,200721391,119897756] |
.paths["/SitiAgriApi/cv/landUseByBusinessParcel/sheet/{sheet}/parcel/{parcel}/sbi/{sbi}/list"].get.parameters[0].schema.examples = ["SS6528","S60869","S15653"] |
.paths["/SitiAgriApi/cv/landUseByBusinessParcel/sheet/{sheet}/parcel/{parcel}/sbi/{sbi}/list"].get.parameters[1].schema.examples = [3756,8463,7211] |
.paths["/SitiAgriApi/cv/landUseByBusinessParcel/sheet/{sheet}/parcel/{parcel}/sbi/{sbi}/list"].get.parameters[2].schema.examples = [107183280]'
    kits=true
    ;;
  # Hitachi API
  pd | payments )
    schema="hitachi/payments"
    mutations='. |
.components.schemas.PaymentsRequest.properties.payment.properties.SupplierAccount.examples = ["5411707635","5305137528","4002722019"]'
    ;;
  *)
    echo "ERROR: Invalid argument: $1" 1>&2
    usage
    exit 1
esac

# mutate target schema - NOTE: the use of `tee` is intentional!!
yq eval -o=json -- "${mutations}" ${rootDir}/src/routes/${schema}-schema.oas.yml \
  | tee ./tmp/schema.json > /dev/null

# run schemathesis tests
if ${kits} ; then # KITS gateway
  if [ -z "${CDP_API_KEY}" ]; then
    echo "ERROR: CDP_API_KEY environment variable is not set" 1>&2
    usage
    exit 1
  fi
  # NOTE: endpoint-specific check exclusions are configured in schemathesis.toml
  docker run --rm --network=host --pull always \
    -v ${baseDir}/tmp:/tmp \
    -v ${baseDir}/schemathesis.toml:/tmp/schemathesis.toml:ro \
    schemathesis/schemathesis:stable \
      --config-file /tmp/schemathesis.toml \
      run /tmp/schema.json \
        --header "email: ${TEST_USER_EMAIL:-testuser01@defra.gov.uk}" \
        --header "x-api-key: ${CDP_API_KEY}" \
        --exclude-checks=unsupported_method,not_a_server_error \
        --report-vcr-path /tmp/vcr.yaml \
        --url "${KITS_URL:-https://ephemeral-protected.api.dev.cdp-int.defra.cloud/fcp-dal-upstream-mock/proxy/internal/extapi}"

else # hitachi
  if [ -z "${HITACHI_CLIENT_SECRET}" ]; then
    echo "ERROR: HITACHI_CLIENT_SECRET environment variable is not set" 1>&2
    usage
    exit 1
  fi

  HITACHI_TOKEN=$( curl --silent --request POST \
    --url https://login.microsoftonline.com/6f504113-6b64-43f2-ade9-242e05780007/oauth2/token \
    --header 'content-type: application/x-www-form-urlencoded' \
    --data grant_type=client_credentials \
    --data client_id=ef36f4e7-126d-46df-bc9b-c608a4b1e8fe \
    --data "client_secret=${HITACHI_CLIENT_SECRET}" \
    --data resource=https://orgcf202fa2.operations.eu.dynamics.com \
    | jq -r '.access_token' )

  # check the token looks good
  if [ "${HITACHI_TOKEN}" = "null" ]; then
    echo "ERROR: HITACHI_TOKEN was not generated correctly, check the secret is correct" 1>&2
    usage
    exit 1
  fi

  docker run --rm --network=host --pull always \
    -v ${baseDir}/tmp:/tmp \
    schemathesis/schemathesis:stable \
      run /tmp/schema.json \
        --exclude-checks=unsupported_method,not_a_server_error \
        --header "Authorization: Bearer ${HITACHI_TOKEN}" \
        --report-vcr-path /tmp/vcr.yaml \
        --url "${HITACHI_URL:-https://orgcf202fa2.operations.eu.dynamics.com/api}"
fi

# cleanup
rm -rf ./tmp
