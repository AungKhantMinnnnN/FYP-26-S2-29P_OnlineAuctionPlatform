import apiClient from './apiClient';

export interface InterestCategory {
  id: string;
  name: string;
  slug: string;
}

export interface InterestsResponse {
  items: InterestCategory[];
}

export const getMyInterests = async (): Promise<InterestsResponse> => {
  const response = await apiClient.get<InterestsResponse>('/users/me/interests');
  return response.data;
};

export const updateMyInterests = async (categoryIds: string[]): Promise<InterestsResponse> => {
  const response = await apiClient.post<InterestsResponse>('/users/me/interests', { category_ids: categoryIds });
  return response.data;
};
