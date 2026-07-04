import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { auctionService } from '../services/auctionService';
import type { ListingParams } from '../services/auctionService';

export const useListings = (params?: ListingParams) => {
  return useQuery({
    queryKey: ['listings', params],
    queryFn: () => auctionService.getListings(params),
  });
};

export const useListing = (id: string) => {
  return useQuery({
    queryKey: ['listing', id],
    queryFn: () => auctionService.getListing(id),
    enabled: !!id,
  });
};

export const usePlaceBid = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ listingId, amount }: { listingId: string; amount: number }) =>
      auctionService.placeBid(listingId, amount),
    onSuccess: (_, variables) => {
      // Invalidate both the single listing and the general list to trigger a refetch
      queryClient.invalidateQueries({ queryKey: ['listing', variables.listingId] });
      queryClient.invalidateQueries({ queryKey: ['listings'] });
    },
  });
};
