import { describe, it, expect, vi, beforeEach } from 'vitest'
import apiClient from './apiClient'
import {
  requestPasswordReset,
  confirmPasswordReset,
  sendEmailVerification,
  confirmEmailVerification,
  changePassword,
} from './authApi'

vi.mock('./apiClient', () => ({
  default: { post: vi.fn() },
}))

const mockedPost = vi.mocked(apiClient.post)

describe('authApi', () => {
  beforeEach(() => {
    mockedPost.mockReset()
    mockedPost.mockResolvedValue({ data: { message: 'ok' } })
  })

  it('requestPasswordReset posts the email to the request endpoint', async () => {
    const result = await requestPasswordReset('a@b.com')
    expect(mockedPost).toHaveBeenCalledWith('/auth/password-reset/request', { email: 'a@b.com' })
    expect(result).toEqual({ message: 'ok' })
  })

  it('confirmPasswordReset posts the token and new password', async () => {
    await confirmPasswordReset('tok', 'newpass')
    expect(mockedPost).toHaveBeenCalledWith('/auth/password-reset/confirm', {
      token: 'tok',
      new_password: 'newpass',
    })
  })

  it('sendEmailVerification posts with no body', async () => {
    await sendEmailVerification()
    expect(mockedPost).toHaveBeenCalledWith('/auth/email-verification/send')
  })

  it('confirmEmailVerification posts the token', async () => {
    await confirmEmailVerification('tok')
    expect(mockedPost).toHaveBeenCalledWith('/auth/email-verification/confirm', { token: 'tok' })
  })

  it('changePassword posts the current and new passwords', async () => {
    await changePassword('old', 'new')
    expect(mockedPost).toHaveBeenCalledWith('/auth/change-password', {
      current_password: 'old',
      new_password: 'new',
    })
  })
})
