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

// NEW: Get user listings
export const getMyListings = async (params?: { page?: number; size?: number }): Promise<PaginatedAuctions> => {
  const response = await apiClient.get<PaginatedAuctions>('/auctions/get_user_listings', { params });
  return response.data;
};

// NEW: Create Listing
export const createListing = async (data: Record<string, unknown>): Promise<AuctionListing> => {
  const response = await apiClient.post<AuctionListing>('/auctions/create_listing', data);
  return response.data;
};

export const uploadAuctionImages = async (id: string, files: File[]): Promise<ListingImage[]> => {
  const formData = new FormData();
  files.forEach(f => formData.append('files', f));
  const response = await apiClient.post<ListingImage[]>(`/auctions/upload_auction_images/${id}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  return response.data;
};

export interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id?: string;
  is_active: boolean;
}

export interface EnumType {
  id: string;
  name: string;
}

export interface MetadataResponse {
  categories: Category[];
  conditions: EnumType[];
  biddingTypes: EnumType[];
}

export const getFormMetadata = async (): Promise<MetadataResponse> => {
  const response = await apiClient.get<MetadataResponse>('/auctions/form_metadata');
  return response.data;
};