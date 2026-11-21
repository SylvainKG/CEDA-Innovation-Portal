import { fromRpcError, rpcError } from '../errors'
import type { MfaPort } from '../mfa'
import { mockSession } from './session'

/**
 * MOCK two-step sign-in (development and demo preview only). The demo personas are seeded demo accounts, so by
 * default they are exempt (D-07), like the hosted demo. `mockMfaControls.requireFor(true)` simulates a real staff
 * account; the mock accepts the code 123456.
 */
const state = { required: false, enrolled: false, verified: false }

export const mockMfaControls = {
  reset() {
    state.required = false
    state.enrolled = false
    state.verified = false
  },
  requireFor(on: boolean) {
    state.required = on
  },
}

export const MOCK_MFA_CODE = '123456'

export const mockMfa: MfaPort = {
  async status() {
    const user = await mockSession.getSession()
    if (!user) return null
    const staff = user.roles.some((r) => r !== 'applicant')
    return { required: staff && state.required && !state.verified, demoExempt: staff && !state.required, enrolled: state.enrolled }
  },

  async enrol() {
    state.enrolled = true
    return { factorId: 'mock-factor', qrCode: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="8" height="8"/>', secret: 'MOCKSECRETDEMO23' }
  },

  async verify({ code }) {
    if (!/^\d{6}$/.test(code.trim())) return fromRpcError(rpcError('VALIDATION', 'Enter the 6-digit code from your app.', { code: 'Enter the 6-digit code' }))
    if (code.trim() !== MOCK_MFA_CODE) return fromRpcError(rpcError('VALIDATION', "That code didn't work. Check the time on your phone and try the newest code.", { code: "That code didn't work" }))
    state.enrolled = true
    state.verified = true
    return { kind: 'ok', data: { verified: true } }
  },
}
