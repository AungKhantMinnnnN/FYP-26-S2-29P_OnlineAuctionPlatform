import apiClient from '../api/apiClient';

export interface Listing {
  id: string;
  title: string;
  description: string;
  starting_price: number;
  current_bid: number;
  end_time: string;
  seller_id: string;
  status: string;
}

export interface ListingParams {
  category?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export const auctionService = {
  getListings: async (params?: ListingParams) => {
    const response = await apiClient.get<Listing[]>('/auctions/', { params });
    return response.data;
  },

  getListing: async (id: string) => {
    const response = await apiClient.get<Listing>(`/auctions/get_auction/${id}`);
    return response.data;
  },

  createListing: async (data: Partial<Listing>) => {
    const response = await apiClient.post<Listing>('/auctions/create_listing', data);
    return response.data;
  },

  placeBid: async (listingId: string, amount: number) => {
    const response = await apiClient.post(`/listings/${listingId}/bids`, { amount });
    return response.data;
  },
};
