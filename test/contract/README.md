# FCP DAL Upstream Contract Testing

The **Contract Testing** assets contained here - along with the _Open API Schema(ta)_ (**OAS**) describing the mock API routes - can be used to test and assure the accuracy of the `fcp-dal-upstream-mock` service.

## General approach

Automated tests are run using `schemathesis`, which runs a bunch of tests to check a target service behaves as a schema describes.
By testing the KITS live services (i.e. `upgrade`), the schemata for the various data domains can be verified.
These same schemata can then be used to check the mock to ensure proper conformance to the upstream.

> NOTE: Some minor schema mutation is necessary to change some fields, e.g. example references for successful data retrieval; but beyond this the mock should mirror exactly the functionality it emulates upstream. See [`test/contract/check-schema.sh`](./check-schema.sh)

## Checking a KITS target

Before running the script, you need to [create a developer API key](https://github.com/DEFRA/cdp-documentation/blob/main/how-to/developer-api-key.md).
This key will be valid for 24 hours.

Run the automated checks using the convenience script, get more by running:

```shell
test/contract/check-schema.sh help
```

...but basically something like the following:

```shell
export CDP_API_KEY=[KEY GENERATED ABOVE]
export KITS_INTERNAL_URL=https://ephemeral-protected.api.dev.cdp-int.defra.cloud/fcp-dal-upstream-mock/proxy/internal/extapi
test/contract/check-schema.sh person
```

This will perform a bunch of tests to check the specified schema (in this case the `person` schema) correctly describes the KITS endpoints' functionality.

> NOTE: Only the KITS `upgrade` service is currently considered for testing, but other environments could also be checked by changing the target and providing the according mTLS details.

> NOTE: The script uses [yq](https://github.com/mikefarah/yq) - ensure you have it installed, as it is not a project-level installation

## Checking local mock

There is now a `/schemata` route that serves the OAS definitions of the mock, so checking mock endpoints match, is as simple as calling an NPM script with the target URL:

```shell
npm run test:contract
```

The above creates a local `docker compose` environment, spinning up the mock API and running `schemathesis` against it.
