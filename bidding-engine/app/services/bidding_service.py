class BiddingService:
    @staticmethod
    def process_bid_message(listing_id: str, data: str) -> str:
        # Business logic for processing bid messages
        return f"Bid update for {listing_id}: {data}"
