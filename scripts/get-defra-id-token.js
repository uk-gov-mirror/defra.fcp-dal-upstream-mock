#!/usr/bin/env node
import * as acorn from 'acorn'
import got from 'got'
import { parse as parseHtml } from 'node-html-parser'
import crypto from 'node:crypto'
import { CookieJar } from 'tough-cookie'

const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'

const MAX_ROUNDS = 8

const REQUIRED_CONFIG = {
  crn: 'CRN',
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
const http = got.extend({
  cookieJar,
  methodRewriting: true,
  throwHttpErrors: false,
  maxRedirects: 20,
  retry: { limit: 0 },
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
  const script = parseHtml(html)
    .querySelectorAll('script')
    .find((el) => el.rawText.includes('var SETTINGS = {'))
  if (!script) return null
  let settings
  try {
    const declaration = acorn
      .parse(script.rawText, { ecmaVersion: 'latest' })
      .body.filter((node) => node.type === 'VariableDeclaration')
      .flatMap((node) => node.declarations)
      .find((node) => node.id.name === 'SETTINGS')
    settings = JSON.parse(script.rawText.slice(declaration.init.start, declaration.init.end))
  } catch {
    return null
  }
  return {
    csrf: settings.csrf ?? null,
    transId: settings.transId ?? null,
    api: settings.api ?? null,
    tenant: settings.hosts?.tenant ?? null,
    policy: settings.hosts?.policy ?? null
  }
}

const parseFieldIds = (html) =>
  [...html.matchAll(/"ID"\s*:\s*"([^"]*)"/g)].map((m) => m[1]).filter(Boolean)

const discoverEndpoints = async (wellKnownUrl) => {
  const oidc = await http(wellKnownUrl, { headers: { accept: 'application/json' } }).json()
  return {
    authorizeEndpoint: oidc.authorization_endpoint,
    tokenEndpoint: oidc.token_endpoint,
    b2cBase: new URL(oidc.authorization_endpoint).origin
  }
}

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
  const crumb = parseHtml(gatePage.body).querySelector('input[name="crumb"]')?.getAttribute('value')
  if (!crumb) throw new Error('Did not reach the idphub check-js page (unexpected journey).')

  const checkJsUrl = new URL('/registration/journey/check-js/check-js-enabled', gatePage.url).href
  const resumePage = await http.post(checkJsUrl, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Referer: checkJsUrl },
    body: new URLSearchParams({ crumb, checkJs: '' }).toString()
  })
  const callbackForm = parseHtml(resumePage.body).querySelector('form[action*="authresp"]')
  const callbackAction = callbackForm?.getAttribute('action')
  const cbCode = callbackForm?.querySelector('input[name="code"]')?.getAttribute('value')
  const cbState = callbackForm?.querySelector('input[name="state"]')?.getAttribute('value')
  if (!callbackAction || !cbCode)
    throw new Error('idphub did not return a callback code (check-js gate failed).')

  const page = await http.post(callbackAction, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Referer: `${b2cBase}/` },
    body: new URLSearchParams({ code: cbCode, state: cbState }).toString()
  })
  return { page, state }
}

const completeSelfAssertedRounds = async (startPage, b2cBase, config) => {
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
    const fields = parseFieldIds(page.body)
    const body = new URLSearchParams({ request_type: 'RESPONSE' })
    if (fields.includes('crn')) {
      body.set('crn', config.crn)
      body.set('password', config.password)
    } else if (fields.includes('currentRelationshipId')) {
      if (!config.relationshipId) {
        throw new Error(
          'This account has multiple businesses and pure-HTTP cannot list them\n' +
            '(they are rendered client-side from a "picker" resource).\n' +
            'Re-run with DEFRA_ID_RELATIONSHIP_ID set.'
        )
      }
      body.set('currentRelationshipId', config.relationshipId)
    } else {
      for (const field of fields) body.set(field, '')
    }

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

    const confirmedUrl = `${b2cBase}${settings.tenant}/api/${settings.api}/confirmed?rememberMe=false&csrf_token=${settings.csrf}&tx=${encodeURIComponent(settings.transId)}&p=${settings.policy}`
    const confirmed = await http.get(confirmedUrl, {
      followRedirect: (response) => !appRedirect(response)
    })
    const redirectToApp = appRedirect(confirmed)
    if (!redirectToApp) {
      page = confirmed
      continue
    }

    const err = redirectToApp.searchParams.get('error')
    if (err) {
      throw new Error(
        `Defra Identity returned error: ${err} - ${redirectToApp.searchParams.get('error_description') || ''}`
      )
    }
    const code = redirectToApp.searchParams.get('code')
    if (!code) {
      throw new Error(
        `Redirected to ${config.redirectUrl} with neither a code nor an error (unexpected journey).`
      )
    }
    return { code, state: redirectToApp.searchParams.get('state') }
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

  return token.access_token || token.id_token
}

const main = async () => {
  const config = readConfig()
  const { authorizeEndpoint, tokenEndpoint, b2cBase } = await discoverEndpoints(config.wellKnownUrl)
  const { page, state } = await passFrontDoor(authorizeEndpoint, b2cBase, config)
  const captured = await completeSelfAssertedRounds(page, b2cBase, config)
  if (captured.state && captured.state !== state)
    throw new Error('State mismatch on redirect (possible CSRF).')

  console.log(await redeemCode(tokenEndpoint, captured.code, config))
}

main().catch((err) => {
  console.error(process.env.DEFRA_ID_DEBUG ? err : err.message)
  process.exitCode = 1
})
