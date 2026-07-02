import apiClient from './apiClient';

export interface InterestsResponse {
  category_ids: string[];
}

// GET /users/me/interests — the current user's saved category interests.
export const getMyInterests = async (): Promise<InterestsResponse> => {
  const response = await apiClient.get<InterestsResponse>('/users/me/interests');
  return response.data;
};

// PUT /users/me/interests — full-replace the current user's interests.
export const updateMyInterests = async (categoryIds: string[]): Promise<InterestsResponse> => {
  const response = await apiClient.put<InterestsResponse>('/users/me/interests', { category_ids: categoryIds });
  return response.data;
};
