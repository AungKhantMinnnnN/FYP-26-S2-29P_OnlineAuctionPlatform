import apiClient from './apiClient';

export interface TrendingListing {
  id: string;
  title: string;
  current_price: number;
  end_time: string | null;
  score: number;
}

export interface TrendingResponse {
  items: TrendingListing[];
  count: number;
  type: string;
}

// GET /recs/trending — global trending when no user_id, personalized when provided.
export const getTrending = async (params?: { user_id?: string; limit?: number }): Promise<TrendingResponse> => {
  const response = await apiClient.get<TrendingResponse>('/recs/trending', { params });
  return response.data;
};
