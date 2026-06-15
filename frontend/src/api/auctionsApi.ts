import apiClient from './apiClient';

export interface ListingImage {
  id: string;
  s3_key: string;
  sort_order: number;
  is_primary: boolean;
  image_url?: string;
}

export interface AuctionListing {
  id: string;
  seller_id: string;
  category_id?: string;
  title: string;
  description?: string;
  condition: string;
  bidding_type: string;
  starting_price?: number;
  reserve_price?: number;
  current_price?: number;
  min_increment?: number;
  status: string;
  start_time: string;
  end_time: string;
  created_at: string;
  updated_at: string;
  images: ListingImage[];
}

export interface PaginatedAuctions {
  items: AuctionListing[];
  total: number;
  page: number;
  size: number;
  pages: number;
}

// Existing function
export const getAuctions = async (params?: { page?: number; size?: number; status?: string; search?: string }): Promise<PaginatedAuctions> => {
  const response = await apiClient.get<PaginatedAuctions>('/auctions/', { params });
  return response.data;
};

// NEW: Create Listing
export const createListing = async (formData: FormData): Promise<AuctionListing> => {
  const response = await apiClient.post<AuctionListing>('/auctions/', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};