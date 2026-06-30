const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:8000/v1.0.0'

function getAuthHeaders() {
  const token = localStorage.getItem('access_token')

  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export interface SupportTicketRequest {
  listing_id: string | null
  category: string
  subject: string
  description: string
}

export async function createSupportTicket(data: SupportTicketRequest) {
  const response = await fetch(`${API_BASE_URL}/disputes/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    throw new Error('Failed to submit support ticket')
  }

  return response.json()
}

export interface TestimonialRequest {
  content: string
  rating: number
}

export async function createTestimonial(data: TestimonialRequest) {
  const response = await fetch(`${API_BASE_URL}/testimonials/`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    throw new Error('Failed to submit testimonial')
  }

  return response.json()
}