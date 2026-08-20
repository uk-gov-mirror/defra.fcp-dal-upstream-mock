# fcp-dal-upstream-mock

Core delivery platform Node.js Backend Template.

- [Requirements](#requirements)
  - [Node.js](#nodejs)
- [Local development](#local-development)
  - [Setup](#setup)
  - [Development](#development)
  - [Testing](#testing)
  - [Production](#production)
  - [Npm scripts](#npm-scripts)
  - [Update dependencies](#update-dependencies)
  - [Formatting](#formatting)
    - [Windows prettier issue](#windows-prettier-issue)
- [API endpoints](#api-endpoints)
- [Schema testing against the KITS upgrade service](#schema-testing-against-the-kits-upgrade-service)
  - [Testing against the external (Defra Identity) upstream](#testing-against-the-external-defra-identity-upstream)
- [Docker](#docker)
  - [Development image](#development-image)
  - [Production image](#production-image)
  - [Dependabot](#dependabot)
  - [SonarCloud](#sonarcloud)
- [Licence](#licence)
  - [About the licence](#about-the-licence)

## Requirements

### Node.js

Please install [Node.js](http://nodejs.org/) `>= v22` and [npm](https://nodejs.org/) `>= v11`. You will find it
easier to use the Node Version Manager [nvm](https://github.com/creationix/nvm), or [`n`](https://github.com/tj/n)

To use the correct version of Node.js for this application, via `nvm`:

```bash
cd fcp-dal-upstream-mock
nvm use
```

## Local development

### Setup

#### Install application dependencies

Install application dependencies:

```bash
npm install
```

#### Implicit lifecycle scripts are disabled

Due to the prevalence of NPM supply-chain attacks, scripts that would usually be run during npm install (and also
pre/post scripts that are run alongside the target script) have been forcibly disabled with the following
setting in `.npmrc`:

```.npmrc
ignore-scripts=true
```

All required post install steps have been gathered into a `postinstall` script. This script contains calls to commands
that would have been run by 3rd party library installers, if `ignore-scripts` had not been set. The commands in this
file have been limited to those that are required for our build process. It would still be prudent to examine this script,
prior to running to ensure that you understand what will be run (you will be prompted to confirm at each step). To run
this script, execute the following:

```bash
npm run postinstall
```

#### 3rd party libraries must be at least 7 days old before they can be installed

The `.npmrc` setting below prevents libraries that have been released in the past 7 days from being installed.

```.npmrc
min-release-age=7
```

This gives the npm community time to detect a compromised release before this repo consumes it.

This does create a potential issue. If `npm audit` identifies an issue that must be fixed, and the patched library
has been released less than 7 days ago, then you will need to investigate the library in question:

- Look at the published release
- Verify that it's safe
- Run `npm install {your-dependency}@{version-number} --min-release-age=0` (including `--save-dev` if it's a dev only dependency)

### Development

To run the application in `development` mode run:

```bash
npm run dev
```

### Testing

To test the application run:

```bash
npm run test
```

> NOTE: Contract testing is described separately [here](./test/contract/README.md).

### Production

To mimic the application running in `production` mode locally run:

```bash
node ./src
```

### Npm scripts

All available Npm scripts can be seen in [package.json](./package.json).
To view them in your command line run:

```bash
npm run
```

### Update dependencies

To update dependencies use [npm-check-updates](https://github.com/raineorshine/npm-check-updates):

> The following script is a good start. Check out all the options on
> the [npm-check-updates](https://github.com/raineorshine/npm-check-updates)

```bash
ncu --interactive --format group
```

### Formatting

#### Windows prettier issue

If you are having issues with formatting of line breaks on Windows update your global git config by running:

```bash
git config --global core.autocrlf false
```

## API endpoints

More information about each logical area of the API can be found by accessing its associated schema.

| Endpoint                          | Description                                                                                                                                      |
| :-------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET: /health`                    | Basic platform health check                                                                                                                      |
| `GET: /schemata/authenticate.yml` | Defines the API for `Authenticate` question answers at `/extapi/external-auth/security-answers/{crn}`                                            |
| `GET: /schemata/organisation.yml` | Defines the API for `organisation` data at `/extapi/organisation`                                                                                |
| `GET: /schemata/payments.yml`     | Defines the API for `payments` data at `/api/services/RSFVendPaymentDetailsServiceGroup/RSFVendPaymentDetailsService/getSupplierPaymentsPackage` |
| `GET: /schemata/person.yml`       | Defines the API for `person` data at `/extapi/person`                                                                                            |
| `GET: /schemata/siti-agri.yml`    | Defines the API for `Siti-Agri` data at `/SitiAgriApi/cv`                                                                                        |

## Schema testing against the KITS upgrade service

It's not possible to directly access the KITS service from a developer machine. The mock service can be used as a proxy
to the KITS service, allowing schema verification. Access to this API is via the CDP ephemeral gateway using a
[developer API key](https://github.com/DEFRA/cdp-documentation/blob/main/how-to/developer-api-key.md) (valid for 24 hours).
You can then access the proxy as shown in the following example

> curl --header 'x-api-key: {API-KEY}' --header 'email: {EMAIL-ADDRESS}' https://ephemeral-protected.api.dev.cdp-int.defra.cloud/fcp-dal-upstream-mock/proxy/internal/extapi/person/3010037/summary

### Testing against the external (Defra Identity) upstream

The KITS **external** gateway (used by e.g. the permissions endpoints) authenticates with a Defra Identity token
rather than an email header. A token can be generated without a browser using:

```bash
npm run generate:defraid-token
```

The script reads its configuration from `.env` (see [.env.example](./.env.example) for the full list). At a minimum
you need the credentials of the user under test (`DEFRA_ID_CRN` and `DEFRA_ID_PASSWORD`) and the Defra Identity OIDC client
config (`DEFRA_ID_WELL_KNOWN_URL`, `DEFRA_ID_CLIENT_ID`, `DEFRA_ID_CLIENT_SECRET`, `DEFRA_ID_SERVICE_ID`,
`DEFRA_ID_POLICY` and `DEFRA_ID_REDIRECT_URL`). If the CRN is linked to more than one business, the first one is
used; set `DEFRA_ID_RELATIONSHIP_ID` to pick a specific one.

The token is printed to stdout; save it as `DEFRA_ID_TOKEN` in `.env` to reuse it.

To run the contract tests against the external upstream, set `CDP_API_KEY` and `KITS_EXTERNAL_URL` in `.env`
(again, see [.env.example](./.env.example)) and run:

```bash
npm run test:contract:local -- perm
```

If `DEFRA_ID_TOKEN` is not set, the test script generates one automatically using the same Defra Identity config.
See the [contract testing README](./test/contract/README.md) for more detail.

## Docker

### Development image

Build:

```bash
docker build --target development --no-cache --tag fcp-dal-upstream-mock:development .
```

Run:

```bash
docker run -e PORT=3001 -p 3001:3001 fcp-dal-upstream-mock:development
```

### Production image

Build:

```bash
docker build --no-cache --tag fcp-dal-upstream-mock .
```

Run:

```bash
docker run -e PORT=3001 -p 3001:3001 fcp-dal-upstream-mock
```

## Licence

THIS INFORMATION IS LICENSED UNDER THE CONDITIONS OF THE OPEN GOVERNMENT LICENCE found at:

<http://www.nationalarchives.gov.uk/doc/open-government-licence/version/3>

The following attribution statement MUST be cited in your products and applications when using this information.

> Contains public sector information licensed under the Open Government license v3

### About the licence

The Open Government Licence (OGL) was developed by the Controller of Her Majesty's Stationery Office (HMSO) to enable
information providers in the public sector to license the use and re-use of their information under a common open
licence.

It is designed to encourage use and re-use of information freely and flexibly, with only a few conditions.
