import { parseRequestedFunctions } from '../../../src/routes/kits-v1/permissions.js'

describe('permissions route - parseRequestedFunctions', () => {
  it('splits a pipe-separated function list', () => {
    expect(parseRequestedFunctions('viewLand|amendBusinessDetails')).toEqual([
      'viewLand',
      'amendBusinessDetails'
    ])
  })

  it('handles a single function', () => {
    expect(parseRequestedFunctions('viewLand')).toEqual(['viewLand'])
  })

  it('drops empty tokens from trailing or doubled trailing pipes, like the upstream', () => {
    expect(parseRequestedFunctions('viewLand||')).toEqual(['viewLand'])
  })

  it('keeps leading and middle empty tokens, like the upstream', () => {
    expect(parseRequestedFunctions('|viewLand')).toEqual(['', 'viewLand'])
    expect(parseRequestedFunctions('viewLand||viewCPH')).toEqual(['viewLand', '', 'viewCPH'])
  })

  it('returns a single empty token for an empty list, like the upstream', () => {
    expect(parseRequestedFunctions('')).toEqual([''])
  })

  it('returns no tokens when the list is only pipes, like the upstream', () => {
    expect(parseRequestedFunctions('||')).toEqual([])
  })
})
