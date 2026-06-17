export const categoryOptions = ["Electronics", "Collectibles", "Fashion", "Home & Garden", "Sports", "Books", "Automotive", "Toys"]
export const categories = categoryOptions.map((name, index) => ({ id: index + 1, name, slug: name.toLowerCase().replace(/&/g, 'and').replace(/\s+/g, '-'), parent_id: null, is_active: true, created_at: '2026-01-01' }))
export const users = [
  { id: 1, username: 'ethan_bidder', email: 'bidder@auctionhub.test', role: 'normal_user', status: 'active', balance: 500, avatar_key: null, created_at: '2026-01-10', updated_at: '2026-05-22' },
  { id: 2, username: 'sarah_seller', email: 'seller@auctionhub.test', role: 'normal_user', status: 'active', balance: 780, avatar_key: null, created_at: '2026-02-15', updated_at: '2026-05-22' },
  { id: 3, username: 'admin_user', email: 'admin@auctionhub.test', role: 'admin', status: 'active', balance: 0, avatar_key: null, created_at: '2025-12-01', updated_at: '2026-05-22' },
  { id: 4, username: 'mike_ross', email: 'mike@example.com', role: 'normal_user', status: 'suspended', balance: 40, avatar_key: null, created_at: '2026-03-03', updated_at: '2026-05-22' },
]

export const user_profiles = [
  { id: 1, user_id: 1, full_name: 'Ethan Bidder', phone: '+65 9123 4567', address: '123 Bukit Timah Rd, Singapore', bio: 'Casual collector of vintage electronics and sneakers.', updated_at: '2026-05-22' },
  { id: 2, user_id: 2, full_name: 'Sarah Seller', phone: '+65 9234 5678', address: 'Orchard Road, Singapore', bio: 'Trusted marketplace seller.', updated_at: '2026-05-22' },
]

export const conditions = ["New", "Used", "Refurbished"]

export const biddingTypes = ["Price Up (English)", "Low Start High", "Public Bidding"]

const now = Date.now()

export const auctions = [
  { id: 1, title: "Vintage Canon AE-1 Film Camera", category: "Electronics", condition: "Used", currentBid: 145.00, startingPrice: 50.00, minIncrement: 5.00, reservePrice: 200.00, endTime: new Date(now + 2 * 60 * 60 * 1000 + 15 * 60 * 1000), seller: { name: "RetroTechSG", rating: 4.8 }, bids: 12, watchers: 34, status: "active", description: "Classic 35mm SLR in working condition. Light cosmetic wear. Lens included.", bidHistory: [{ bidder: "userA", amount: 145.00, time: "10 min ago" }, { bidder: "userB", amount: 140.00, time: "25 min ago" }, { bidder: "userC", amount: 135.00, time: "40 min ago" }] },
  { id: 2, title: "Nike Air Jordan 1 Retro High", category: "Fashion", condition: "New", currentBid: 220.00, startingPrice: 150.00, minIncrement: 10.00, reservePrice: 250.00, endTime: new Date(now + 5 * 60 * 60 * 1000), seller: { name: "SneakerVault", rating: 4.9 }, bids: 8, watchers: 56, status: "active", description: "Deadstock with original box. Size US 9.5.", bidHistory: [{ bidder: "sneakFan", amount: 220.00, time: "5 min ago" }, { bidder: "bidderX", amount: 210.00, time: "20 min ago" }] },
  { id: 3, title: "Rare 1998 Pokémon Charizard Card", category: "Collectibles", condition: "Used", currentBid: 85.00, startingPrice: 20.00, minIncrement: 5.00, reservePrice: 100.00, endTime: new Date(now + 45 * 60 * 1000), seller: { name: "CardCollector", rating: 4.6 }, bids: 22, watchers: 89, status: "active", description: "Non-holo Base Set. Good edges, slight centering issues.", bidHistory: [{ bidder: "pokeFan", amount: 85.00, time: "2 min ago" }, { bidder: "ashK", amount: 80.00, time: "8 min ago" }] },
  { id: 4, title: "Dyson V12 Detect Slim Vacuum", category: "Home & Garden", condition: "Refurbished", currentBid: 310.00, startingPrice: 200.00, minIncrement: 10.00, reservePrice: 350.00, endTime: new Date(now + 24 * 60 * 60 * 1000), seller: { name: "HomeDeals", rating: 4.7 }, bids: 6, watchers: 19, status: "active", description: "Manufacturer refurbished with 1-year warranty.", bidHistory: [{ bidder: "cleanFreak", amount: 310.00, time: "1 hour ago" }] },
  { id: 5, title: "Apple Watch Series 9 45mm", category: "Electronics", condition: "New", currentBid: 380.00, startingPrice: 300.00, minIncrement: 10.00, reservePrice: 400.00, endTime: new Date(now + 3 * 60 * 60 * 1000), seller: { name: "TechMart", rating: 4.9 }, bids: 14, watchers: 42, status: "active", description: "GPS + Cellular. Midnight aluminum case. Sealed.", bidHistory: [{ bidder: "watchGuy", amount: 380.00, time: "15 min ago" }, { bidder: "appleFan", amount: 370.00, time: "30 min ago" }] },
  { id: 6, title: "Mid-Century Modern Lounge Chair", category: "Home & Garden", condition: "Used", currentBid: 120.00, startingPrice: 80.00, minIncrement: 5.00, reservePrice: 150.00, endTime: new Date(now - 60 * 60 * 1000), seller: { name: "VintageHome", rating: 4.5 }, bids: 5, watchers: 12, status: "ended", description: "Teak frame with original fabric. Minor patina.", bidHistory: [{ bidder: "designLvr", amount: 120.00, time: "2 hours ago" }] },
  { id: 7, title: "Sony WH-1000XM5 Headphones", category: "Electronics", condition: "New", currentBid: 290.00, startingPrice: 200.00, minIncrement: 10.00, reservePrice: 320.00, endTime: new Date(now + 8 * 60 * 60 * 1000), seller: { name: "AudioHub", rating: 4.8 }, bids: 9, watchers: 27, status: "active", description: "Noise cancelling, 30hr battery. Silver.", bidHistory: [{ bidder: "beatMaker", amount: 290.00, time: "50 min ago" }] },
  { id: 8, title: "Signed Stephen King Novel (1st Ed)", category: "Books", condition: "Used", currentBid: 450.00, startingPrice: 300.00, minIncrement: 20.00, reservePrice: 500.00, endTime: new Date(now + 12 * 60 * 60 * 1000), seller: { name: "BookWorm", rating: 5.0 }, bids: 3, watchers: 15, status: "active", description: "The Shining, first edition, signed by author. Includes COA.", bidHistory: [{ bidder: "horrorFan", amount: 450.00, time: "3 hours ago" }] },
]

export const listings = auctions.map((auction) => ({
  ...auction,
  seller_id: auction.id === 6 ? 2 : 2,
  category_id: categories.find((category) => category.name === auction.category)?.id,
  condition: auction.condition.toLowerCase(),
  bidding_type: 'price_up',
  starting_price: auction.startingPrice,
  reserve_price: auction.reservePrice,
  current_price: auction.currentBid,
  min_increment: auction.minIncrement,
  is_draft: false,
  start_time: new Date(now - 24 * 60 * 60 * 1000),
  end_time: auction.endTime,
  created_at: '2026-05-20',
  updated_at: '2026-05-22',
}))

export const listing_images = listings.map((listing) => ({
  id: listing.id,
  listing_id: listing.id,
  s3_key: `mock/listings/${listing.id}.jpg`,
  sort_order: 0,
  is_primary: true,
  uploaded_at: '2026-05-20',
}))

export const watchlist = [
  { id: 1, user_id: 1, listing_id: 1, added_at: '2026-05-22, 10:10' },
  { id: 2, user_id: 1, listing_id: 2, added_at: '2026-05-22, 10:25' },
  { id: 3, user_id: 1, listing_id: 3, added_at: '2026-05-22, 11:00' },
  { id: 4, user_id: 1, listing_id: 5, added_at: '2026-05-22, 12:40' },
  { id: 5, user_id: 1, listing_id: 7, added_at: '2026-05-22, 13:05' },
  { id: 6, user_id: 2, listing_id: 4, added_at: '2026-05-22, 14:00' },
  { id: 7, user_id: 2, listing_id: 6, added_at: '2026-05-22, 15:35' },
  { id: 8, user_id: 2, listing_id: 8, added_at: '2026-05-22, 16:20' },
]
export const WatchList = watchlist.map((item) => ({ WatchListID: item.id, UserID: item.user_id, ListingID: item.listing_id }))

export const wallet_transactions = [
  { id: 1, user_id: 1, type: 'topup', amount: 100, reference: 'Credit Card', status: 'completed', created_at: '22 May 2026, 10:15' },
  { id: 2, user_id: 1, type: 'bid_hold', amount: -145, reference: 'Wallet hold for listing #1', status: 'completed', created_at: '22 May 2026, 11:20' },
  { id: 3, user_id: 1, type: 'bid_release', amount: 210, reference: 'Released bid hold', status: 'completed', created_at: '21 May 2026, 16:45' },
  { id: 4, user_id: 1, type: 'topup', amount: 250, reference: 'PayNow', status: 'completed', created_at: '19 May 2026, 14:10' },
  { id: 5, user_id: 2, type: 'topup', amount: 500, reference: 'Credit Card', status: 'completed', created_at: '22 May 2026, 12:00' },
  { id: 6, user_id: 2, type: 'settlement', amount: 350, reference: 'Auction settlement', status: 'completed', created_at: '20 May 2026, 18:35' },
  { id: 7, user_id: 1, type: 'bid_hold', amount: -85, reference: 'Wallet hold for listing #3', status: 'completed', created_at: '18 May 2026, 08:55' },
]
export const WalletTransactions = wallet_transactions.map((transaction) => ({ TransactionID: transaction.id, UserID: transaction.user_id, TransactionType: transaction.type, Amount: transaction.amount, TransactionStatus: transaction.status, Method: transaction.reference, Created_at: transaction.created_at }))

export const Bids = [
  { id: 1, listing_id: 1, bidder_id: 1, amount: 145, status: 'accepted', placed_at: '10 min ago' },
  { id: 2, listing_id: 2, bidder_id: 1, amount: 210, status: 'accepted', placed_at: '20 min ago' },
  { id: 3, listing_id: 3, bidder_id: 1, amount: 75, status: 'accepted', placed_at: '12 May 2026, 11:20' },
]

export const currentUser = {
  id: 1,
  fullName: "Alex Tan",
  username: "alextan",
  email: "alex@example.com",
  phone: "+65 9123 4567",
  address: "123 Bukit Timah Rd, Singapore",
  bio: "Casual collector of vintage electronics and sneakers.",
  balance: 500.00,
  bidsActive: 3,
  watchlistCount: 5,
  wins: 2,
}

export const bidHistory = [
  { id: 1, item: "Vintage Canon AE-1 Film Camera", amount: 145.00, timestamp: "14 May 2026, 14:30", status: "accepted", result: "Leading" },
  { id: 2, item: "Nike Air Jordan 1 Retro High", amount: 210.00, timestamp: "13 May 2026, 09:15", status: "accepted", result: "Outbid" },
  { id: 3, item: "Mid-Century Modern Lounge Chair", amount: 120.00, timestamp: "10 May 2026, 18:00", status: "accepted", result: "Won" },
  { id: 4, item: "Rare 1998 Pokémon Charizard Card", amount: 75.00, timestamp: "12 May 2026, 11:20", status: "accepted", result: "Lost" },
  { id: 5, item: "Dyson V12 Detect Slim Vacuum", amount: 310.00, timestamp: "14 May 2026, 08:45", status: "accepted", result: "Leading" },
]
export const bids = Bids

export const auction_results = [
  { id: 1, listing_id: 6, winner_id: 1, winning_bid_id: 3, final_price: 120, reserve_met: false, ended_at: '22 May 2026, 09:00' },
]

export const user_interactions = [
  { id: 1, user_id: 1, listing_id: 1, action: 'view', occurred_at: '22 May 2026, 10:00' },
  { id: 2, user_id: 1, listing_id: 2, action: 'watchlist', occurred_at: '22 May 2026, 10:25' },
]
export const adminCases = [
  { case_id: 'CASE-001', user_id: 1, case_type: 'Dispute', subject: 'Item not as described', status: 'open', created_at: '12 May 2026' },
  { case_id: 'CASE-002', user_id: 2, case_type: 'Feedback', subject: 'Request refund', status: 'open', created_at: '13 May 2026' },
  { case_id: 'CASE-003', user_id: 4, case_type: 'Dispute', subject: 'Accidental bid', status: 'resolved', created_at: '10 May 2026' },
]

export const sellerListings = auctions.filter(a => a.status === "active").slice(0, 4)
export const soldItems = [auctions[5]]
export const drafts = [
  { id: 101, title: "Draft: PlayStation 5 Console", category: "Electronics", condition: "New", startingPrice: 450.00, updatedAt: "13 May 2026" },
  { id: 102, title: "Draft: Antique Wall Clock", category: "Collectibles", condition: "Used", startingPrice: 120.00, updatedAt: "12 May 2026" },
]

export const notifications = [
  { id: 1, text: "You have been outbid on 'Nike Air Jordan 1 Retro High'", time: "5 min ago", read: false },
  { id: 2, text: "Your listing 'Vintage Canon AE-1' received a new bid", time: "10 min ago", read: false },
  { id: 3, text: "Auction ended: 'Mid-Century Modern Lounge Chair'. You won!", time: "2 hours ago", read: true },
]

export const recentActivity = [
  { text: "Placed bid on Canon AE-1", time: "10 min ago" },
  { text: "Added Nike Air Jordan 1 to watchlist", time: "25 min ago" },
  { text: "Won Mid-Century Modern Lounge Chair", time: "2 hours ago" },
]

export const adminStats = {
  totalUsers: 1248,
  activeAuctions: 342,
  pendingModeration: 18,
  openCases: 7,
  totalSales: 8920,
  revenue: 124500,
}

export const adminUsers = [
  { id: 1, name: "John Doe", email: "john@example.com", role: "Bidder", status: "active", joined: "10 Jan 2026" },
  { id: 2, name: "Jane Smith", email: "jane@example.com", role: "Seller", status: "active", joined: "15 Feb 2026" },
  { id: 3, name: "Mike Ross", email: "mike@example.com", role: "Bidder", status: "suspended", joined: "03 Mar 2026" },
  { id: 4, name: "Sarah Lee", email: "sarah@example.com", role: "Seller", status: "active", joined: "22 Apr 2026" },
]

export const listingModeration = [
  { id: 1, title: "Vintage Rolex Submariner", seller: "WatchDealer", submitted: "14 May 2026", status: "pending_review" },
  { id: 2, title: "Handmade Ceramic Vase", seller: "ArtisanSG", submitted: "14 May 2026", status: "pending_review" },
  { id: 3, title: "Gaming Laptop RTX 4090", seller: "PCBuildz", submitted: "13 May 2026", status: "removed" },
]

export const caseQueue = [
  { id: "CASE-001", user: "John Doe", type: "Dispute", subject: "Item not as described", status: "open", date: "12 May 2026" },
  { id: "CASE-002", user: "Jane Smith", type: "Feedback", subject: "Request refund", status: "open", date: "13 May 2026" },
  { id: "CASE-003", user: "Mike Ross", type: "Dispute", subject: "Accidental bid", status: "resolved", date: "10 May 2026" },
]

export const auditLogs = [
  { id: 1, admin: "SuperAdmin", action: "Suspended user Mike Ross", timestamp: "14 May 2026, 10:00" },
  { id: 2, admin: "SuperAdmin", action: "Approved listing #1024", timestamp: "14 May 2026, 09:45" },
  { id: 3, admin: "SuperAdmin", action: "Removed listing #998 (policy violation)", timestamp: "13 May 2026, 16:20" },
  { id: 4, admin: "SuperAdmin", action: "Overrode bid on auction #45", timestamp: "13 May 2026, 14:10" },
]