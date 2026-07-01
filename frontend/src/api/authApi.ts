import apiClient from './apiClient'

export interface GenericMessageResponse {
  message: string
}

export const requestPasswordReset = async (email: string): Promise<GenericMessageResponse> => {
  const response = await apiClient.post<GenericMessageResponse>('/auth/password-reset/request', { email })
  return response.data
}

export const confirmPasswordReset = async (token: string, newPassword: string): Promise<GenericMessageResponse> => {
  const response = await apiClient.post<GenericMessageResponse>('/auth/password-reset/confirm', {
    token,
    new_password: newPassword,
  })
  return response.data
}

export const sendEmailVerification = async (): Promise<GenericMessageResponse> => {
  const response = await apiClient.post<GenericMessageResponse>('/auth/email-verification/send')
  return response.data
}

export const confirmEmailVerification = async (token: string): Promise<GenericMessageResponse> => {
  const response = await apiClient.post<GenericMessageResponse>('/auth/email-verification/confirm', { token })
  return response.data
}
