import apiClient from './apiClient'

export interface IssueType {
  id: string
  name: string
  created_at: string
}

export const getIssueTypes = async (): Promise<IssueType[]> => {
  const response = await apiClient.get<IssueType[]>('/issue-types/')
  return response.data
}

export interface SupportTicketRequest {
  listing_id: string | null
  issue_type_id: string
  subject: string
  category: string
  description: string
}

export interface SupportTicketResponse {
  id: string
  reporter_id: string
  listing_id: string | null
  issue_type_id: string | null
  subject: string | null
  category: string
  description: string
  status: 'open' | 'in_review' | 'resolved' | 'closed'
  resolution_note: string | null
  resolved_at: string | null
  created_at: string
}

export const createSupportTicket = async (
  data: SupportTicketRequest
): Promise<SupportTicketResponse> => {
  const response = await apiClient.post<SupportTicketResponse>(
    '/disputes/',
    data
  )

  return response.data
}

export interface TestimonialRequest {
  content: string
  rating: number
}

export interface TestimonialResponse {
  id: string
  user_id: string
  content: string
  rating: number
  is_featured: boolean
  created_at: string
}

export const createTestimonial = async (
  data: TestimonialRequest
): Promise<TestimonialResponse> => {
  const response = await apiClient.post<TestimonialResponse>(
    '/testimonials/',
    data
  )

  return response.data
}