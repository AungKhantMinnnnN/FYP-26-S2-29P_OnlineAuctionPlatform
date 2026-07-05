import { recsClient } from './apiClient';

export interface ListingImageItem {
  id: string;
  s3_key: string;
  sort_order: number;
  is_primary: boolean;
  image_url: string | null;
}

export interface SellerItem {
  id: string;
  username: string;
  email: string;
}

export interface TrendingListing {
  id: string;
  seller_id: string;
  category_id: string | null;
  title: string;
  description: string | null;
  brand: string | null;
  condition: string;
  condition_confidence: number | null;
  bidding_type: string;
  starting_price: number | null;
  reserve_price: number | null;
  current_price: number | null;
  min_increment: number | null;
  status: string;
  is_draft: boolean;
  start_time: string | null;
  end_time: string | null;
  created_at: string;
  updated_at: string;
  images: ListingImageItem[];
  seller: SellerItem | null;
  score: number;
}

export interface TrendingResponse {
  items: TrendingListing[];
  count: number;
  type: string;
}

export const getTrending = async (params?: { user_id?: string; limit?: number }): Promise<TrendingResponse> => {
  const response = await recsClient.get<TrendingResponse>('/recs/trending', { params });
  return response.data;
};
