#!/usr/bin/env node
import got from 'got'
import crypto from 'node:crypto'
import { CookieJar } from 'tough-cookie'

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

const MAX_ROUNDS = 8

const REQUIRED_CONFIG = {
  crn: 'DEFRA_ID_CRN',
  password: 'DEFRA_ID_PASSWORD',
  wellKnownUrl: 'DEFRA_ID_WELL_KNOWN_URL',
  clientId: 'DEFRA_ID_CLIENT_ID',
  clientSecret: 'DEFRA_ID_CLIENT_SECRET',
  serviceId: 'DEFRA_ID_SERVICE_ID',
  policy: 'DEFRA_ID_POLICY',
  redirectUrl: 'DEFRA_ID_REDIRECT_URL'
}
const OPTIONAL_CONFIG = { relationshipId: 'DEFRA_ID_RELATIONSHIP_ID' }

const readConfig = () => {
  const config = Object.fromEntries(
    Object.entries({ ...REQUIRED_CONFIG, ...OPTIONAL_CONFIG }).map(([key, envVar]) => [
      key,
      process.env[envVar]
    ])
  )
  const missing = Object.entries(REQUIRED_CONFIG)
    .filter(([key]) => !config[key])
    .map(([, envVar]) => envVar)
  if (missing.length) {
    throw new Error(`Missing required config: ${missing.join(', ')}`)
  }
  return { ...config, scope: `openid offline_access ${config.clientId}` }
}

const cookieJar = new CookieJar()
// The Defra ID hosts intermittently drop connections (timeouts, TLS resets); a short
// pause and retry recovers these without restarting the whole journey. The journey's
// POSTs are all safe to re-submit, so retry those too.
const http = got.extend({
  cookieJar,
  methodRewriting: true,
  throwHttpErrors: false,
  maxRedirects: 20,
  retry: { limit: 3, methods: ['GET', 'POST'] },
  headers: {
    'user-agent': UA,
    accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
  }
})

const tryJson = (body) => {
  try {
    return JSON.parse(body)
  } catch {
    return {}
  }
}

const parseSettings = (html) => {
  const marker = 'var SETTINGS = '
  const start = html.indexOf(marker + '{')
  if (start === -1) return null
  const from = start + marker.length
  // the SETTINGS object contains nested braces, so grow the slice one `}` at a
  // time until it parses
  for (let end = html.indexOf('}', from); end !== -1; end = html.indexOf('}', end + 1)) {
    try {
      const settings = JSON.parse(html.slice(from, end + 1))
      return {
        csrf: settings.csrf ?? null,
        transId: settings.transId ?? null,
        api: settings.api ?? null,
        tenant: settings.hosts?.tenant ?? null,
        policy: settings.hosts?.policy ?? null
      }
    } catch {
      // not the closing brace yet - keep growing
    }
  }
  return null
}

const parseFieldIds = (html) =>
  [...html.matchAll(/"ID"\s*:\s*"([^"]*)"/g)].map((m) => m[1]).filter(Boolean)

const inputValue = (html, name) =>
  html.match(new RegExp(`<input[^>]*name="${name}"[^>]*value="([^"]*)"`))?.[1] ??
  html.match(new RegExp(`<input[^>]*value="([^"]*)"[^>]*name="${name}"`))?.[1]

// The business-picker page renders its options client-side, so replicate the call its
// JS (idphub picker.js) makes: POST the page's prefilled claims to the idphub
// user-relationships API, authorised with the page's prefilled bearer token.
const firstRelationshipId = async (pickerPageHtml) => {
  const pre = (id) =>
    pickerPageHtml.match(
      new RegExp(`"ID":\\s*"${id}"[^}]*?"PRE":\\s*"((?:[^"\\\\]|\\\\.)*)"`, 's')
    )?.[1]
  const remoteResource = pickerPageHtml.match(/"remoteResource"\s*:\s*"([^"]+)"/)?.[1]
  const bearerToken = pre('bearerToken')
  const fail = (reason) => {
    throw new Error(
      `Could not list this account's businesses (${reason}).\n` +
        'Re-run with DEFRA_ID_RELATIONSHIP_ID set to pick one explicitly.'
    )
  }
  if (!remoteResource || !bearerToken) fail('picker page had no remoteResource/bearerToken')

  const fragment = await http.get(remoteResource)
  const relationshipsUrl = fragment.body.match(/data-user-relationships-page="([^"]+)"/)?.[1]
  if (!relationshipsUrl) fail('picker fragment had no user-relationships URL')

  const payload = {
    id: pre('objectId'),
    serviceId: pre('serviceId'),
    correlationId: pre('correlationId'),
    sessionId: pre('sessionId'),
    amr: new URL(remoteResource).searchParams.get('amr')
  }
  if (pre('dataStoreId')) payload.dataStoreId = pre('dataStoreId')
  const res = await http.post(relationshipsUrl, {
    headers: { Authorization: `Bearer ${bearerToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  const relationships = tryJson(res.body).relationships
  if (!res.ok || !relationships?.length) fail(`user-relationships returned HTTP ${res.statusCode}`)

  const first = relationships[0]
  console.error(
    `DEFRA_ID_RELATIONSHIP_ID not set; defaulting to the first of ${relationships.length} ` +
      `businesses: ${first.organisationName} (relationship ${first.id}, organisation ${first.organisationId})`
  )
  return first.id
}

const discoverEndpoints = async (wellKnownUrl) => {
  const oidc = await http(wellKnownUrl, { headers: { accept: 'application/json' } }).json()
  return {
    authorizeEndpoint: oidc.authorization_endpoint,
    tokenEndpoint: oidc.token_endpoint,
    b2cBase: new URL(oidc.authorization_endpoint).origin
  }
}

// Front door: idphub check-js gate, then relay the auto-POST callback to B2C;
// returns the first B2C SelfAsserted page
const passFrontDoor = async (authorizeEndpoint, b2cBase, config) => {
  const state = crypto.randomUUID()
  const authorizeUrl =
    authorizeEndpoint +
    '?' +
    new URLSearchParams({
      client_id: config.clientId,
      response_type: 'code',
      redirect_uri: config.redirectUrl,
      scope: config.scope,
      response_mode: 'query',
      state,
      nonce: crypto.randomUUID(),
      serviceId: config.serviceId,
      p: config.policy
    })
  const gatePage = await http.get(authorizeUrl)
  const crumb = inputValue(gatePage.body, 'crumb')
  if (!crumb) throw new Error('Did not reach the idphub check-js page (unexpected journey).')

  const checkJsUrl = new URL('/registration/journey/check-js/check-js-enabled', gatePage.url).href
  const resumePage = await http.post(checkJsUrl, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Referer: checkJsUrl },
    body: new URLSearchParams({ crumb, checkJs: '' }).toString()
  })
  const callbackAction = resumePage.body
    .match(/<form[^>]*action="([^"]*authresp[^"]*)"/)?.[1]
    ?.replace(/&amp;/g, '&')
  const cbCode = inputValue(resumePage.body, 'code')
  const cbState = inputValue(resumePage.body, 'state')
  if (!callbackAction || !cbCode)
    throw new Error('idphub did not return a callback code (check-js gate failed).')

  const page = await http.post(callbackAction, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Referer: `${b2cBase}/` },
    body: new URLSearchParams({ code: cbCode, state: cbState }).toString()
  })
  return { page, state }
}

// what to submit for the current page: crn+password, business picker, or an
// empty pre-step
const stepBody = async (pageHtml, config) => {
  const fields = parseFieldIds(pageHtml)
  const body = new URLSearchParams({ request_type: 'RESPONSE' })
  if (fields.includes('crn')) {
    body.set('crn', config.crn)
    body.set('password', config.password)
  } else if (fields.includes('currentRelationshipId')) {
    body.set(
      'currentRelationshipId',
      config.relationshipId || (await firstRelationshipId(pageHtml))
    )
  } else {
    for (const field of fields) body.set(field, '')
  }
  return body
}

const submitStep = async (settings, body, b2cBase) => {
  const saUrl = `${b2cBase}${settings.tenant}/SelfAsserted?tx=${encodeURIComponent(settings.transId)}&p=${settings.policy}`
  const saRes = await http.post(saUrl, {
    followRedirect: false,
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
      'X-CSRF-TOKEN': settings.csrf,
      'X-Requested-With': 'XMLHttpRequest',
      Referer: `${b2cBase}${settings.tenant}/`
    },
    body: body.toString()
  })
  const saJson = tryJson(saRes.body)
  if (!saRes.ok || (saJson.status && String(saJson.status) !== '200')) {
    throw new Error(
      `B2C rejected the step (HTTP ${saRes.statusCode}, status ${saJson.status ?? 'none'}): ` +
        (saJson.message || saRes.body.slice(0, 200))
    )
  }
}

const confirmStep = (settings, b2cBase, appRedirect) =>
  http.get(
    `${b2cBase}${settings.tenant}/api/${settings.api}/confirmed?rememberMe=false&csrf_token=${settings.csrf}&tx=${encodeURIComponent(settings.transId)}&p=${settings.policy}`,
    { followRedirect: (response) => !appRedirect(response) }
  )

const extractAuthCode = (redirectToApp, state) => {
  const err = redirectToApp.searchParams.get('error')
  if (err) {
    throw new Error(
      `Defra Identity returned error: ${err} - ${redirectToApp.searchParams.get('error_description') || ''}`
    )
  }
  const code = redirectToApp.searchParams.get('code')
  if (!code) {
    throw new Error('Redirected back with neither a code nor an error (unexpected journey).')
  }
  const returnedState = redirectToApp.searchParams.get('state')
  if (returnedState && returnedState !== state) {
    throw new Error('State mismatch on redirect (possible CSRF).')
  }
  return code
}

// B2C SelfAsserted rounds: pre-step, crn+password, business picker (if shown);
// returns the authorization code once B2C redirects back to the app
const completeSelfAssertedRounds = async (startPage, b2cBase, state, config) => {
  let page = startPage
  const redirectOrigin = new URL(config.redirectUrl).origin
  const appRedirect = (response) => {
    const location = response.headers.location
    if (!location) return null
    const next = new URL(location, response.url)
    return next.href.startsWith(redirectOrigin) ? next : null
  }

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const settings = parseSettings(page.body)
    if (!settings || !settings.csrf || !settings.transId) {
      throw new Error(
        `Expected a B2C SelfAsserted page but found none (round ${round}). ` +
          (/error/i.test(page.body)
            ? 'The page mentions an error — check credentials.'
            : 'Journey may have changed.')
      )
    }
    await submitStep(settings, await stepBody(page.body, config), b2cBase)
    const confirmed = await confirmStep(settings, b2cBase, appRedirect)
    const redirectToApp = appRedirect(confirmed)
    if (redirectToApp) return extractAuthCode(redirectToApp, state)
    page = confirmed
  }

  throw new Error(`Completed ${MAX_ROUNDS} journey rounds without a redirect back to the app.`)
}

const redeemCode = async (tokenEndpoint, code, config) => {
  const tokenRes = await http.post(tokenEndpoint, {
    followRedirect: false,
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', accept: 'application/json' },
    body: new URLSearchParams({
      client_id: config.clientId,
      client_secret: config.clientSecret,
      grant_type: 'authorization_code',
      code,
      redirect_uri: config.redirectUrl,
      scope: config.scope
    }).toString()
  })
  const token = tryJson(tokenRes.body)
  if (!tokenRes.ok || token.error) {
    throw new Error(
      `Token endpoint failed: HTTP ${tokenRes.statusCode}\n${token.error || ''}: ${(token.error_description || '').split(/\r?\n/)[0]}`
    )
  }
  if (!token.access_token) {
    throw new Error(
      'Token endpoint returned no access_token (is the client id missing from the requested scope?)'
    )
  }
  return token.access_token
}

const main = async () => {
  const config = readConfig()
  const { authorizeEndpoint, tokenEndpoint, b2cBase } = await discoverEndpoints(config.wellKnownUrl)
  const { page, state } = await passFrontDoor(authorizeEndpoint, b2cBase, config)
  const code = await completeSelfAssertedRounds(page, b2cBase, state, config)
  console.log(await redeemCode(tokenEndpoint, code, config))
}

main().catch((err) => {
  console.error(process.env.DEFRA_ID_DEBUG ? err : err.message)
  process.exitCode = 1
})
