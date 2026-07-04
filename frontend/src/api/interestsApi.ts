import apiClient from './apiClient';

export interface InterestCategory {
  id: string;
  name: string;
  slug: string;
}

export interface InterestsResponse {
  items: InterestCategory[];
}

// GET /users/me/interests — the current user's saved category interests.
export const getMyInterests = async (): Promise<InterestsResponse> => {
  const response = await apiClient.get<InterestsResponse>('/users/me/interests');
  return response.data;
};

// PUT /users/me/interests — full-replace the current user's interests.
export const updateMyInterests = async (categoryIds: string[]): Promise<InterestsResponse> => {
  const response = await apiClient.post<InterestsResponse>('/users/me/interests', { category_ids: categoryIds });
  return response.data;
};
