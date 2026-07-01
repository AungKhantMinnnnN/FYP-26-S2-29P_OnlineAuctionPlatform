import apiClient from './apiClient';

export interface WatchlistResponse {
  // The backend also returns `items`, but the detail page only needs the ids
  // to determine whether the current listing is already watched.
  listing_ids: string[];
}

export interface WatchlistAddResponse {
  watchlist_id: string;
  listing_id: string;
  added_at: string;
}

// GET /users/me/watchlist — current user's watchlist (ids used for watched-state).
export const getMyWatchlist = async (): Promise<WatchlistResponse> => {
  const response = await apiClient.get<WatchlistResponse>('/users/me/watchlist');
  return response.data;
};

// POST /users/me/watchlist — add a listing to the watchlist.
export const addToWatchlist = async (listingId: string): Promise<WatchlistAddResponse> => {
  const response = await apiClient.post<WatchlistAddResponse>('/users/me/watchlist', { listing_id: listingId });
  return response.data;
};

// DELETE /users/me/watchlist/{listingId} — remove a listing from the watchlist.
export const removeFromWatchlist = async (listingId: string): Promise<void> => {
  await apiClient.delete(`/users/me/watchlist/${listingId}`);
};
