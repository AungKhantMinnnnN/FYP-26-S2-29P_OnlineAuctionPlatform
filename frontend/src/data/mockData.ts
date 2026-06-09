export const categories = ["Electronics", "Collectibles", "Fashion", "Home & Garden", "Sports", "Books", "Automotive", "Toys"]

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
  { id: 1, item: "Vintage Canon AE-1 Film Camera", amount: 145.00, timestamp: "14 May 2026, 14:30", status: "active", result: "Leading" },
  { id: 2, item: "Nike Air Jordan 1 Retro High", amount: 210.00, timestamp: "13 May 2026, 09:15", status: "outbid", result: "Outbid" },
  { id: 3, item: "Mid-Century Modern Lounge Chair", amount: 120.00, timestamp: "10 May 2026, 18:00", status: "won", result: "Won" },
  { id: 4, item: "Rare 1998 Pokémon Charizard Card", amount: 75.00, timestamp: "12 May 2026, 11:20", status: "outbid", result: "Lost" },
  { id: 5, item: "Dyson V12 Detect Slim Vacuum", amount: 310.00, timestamp: "14 May 2026, 08:45", status: "active", result: "Leading" },
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
  { id: 1, title: "Vintage Rolex Submariner", seller: "WatchDealer", submitted: "14 May 2026", status: "pending" },
  { id: 2, title: "Handmade Ceramic Vase", seller: "ArtisanSG", submitted: "14 May 2026", status: "pending" },
  { id: 3, title: "Gaming Laptop RTX 4090", seller: "PCBuildz", submitted: "13 May 2026", status: "reported" },
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

export const users = [
  { user_id: 1, full_name: 'Ethan Bidder', email: 'bidder@auctionhub.test', role: 'user', status: 'active', created_at: '2026-01-10' },
  { user_id: 2, full_name: 'Sarah Seller', email: 'seller@auctionhub.test', role: 'user', status: 'active', created_at: '2026-02-15' },
  { user_id: 3, full_name: 'Admin User', email: 'admin@auctionhub.test', role: 'admin', status: 'active', created_at: '2025-12-01' },
  { user_id: 4, full_name: 'Mike Ross', email: 'mike@example.com', role: 'user', status: 'suspended', created_at: '2026-03-03' },
]

export const bids = bidHistory.map((b) => ({ bid_id: b.id, listing_title: b.item, bidder_id: 1, bid_amount: b.amount, status: b.status, created_at: b.timestamp }))

export const adminCases = [
  { case_id: 'CASE-001', user_id: 1, case_type: 'Dispute', subject: 'Item not as described', status: 'open', created_at: '12 May 2026' },
  { case_id: 'CASE-002', user_id: 2, case_type: 'Feedback', subject: 'Request refund', status: 'open', created_at: '13 May 2026' },
  { case_id: 'CASE-003', user_id: 4, case_type: 'Dispute', subject: 'Accidental bid', status: 'resolved', created_at: '10 May 2026' },
]

export interface WatchListItem {
  WatchListID: number;
  UserID: number;
  ListingID: number;
}

export interface WalletTransactionItem {
  TransactionID: string | number;
  UserID: number;
  TransactionType: string;
  Amount: number;
  TransactionStatus: string;
  Method: string;
  Created_at: string;
}

export const WatchList: WatchListItem[] = [
  { WatchListID: 1, UserID: 1, ListingID: 1 },
  { WatchListID: 2, UserID: 1, ListingID: 2 },
  { WatchListID: 3, UserID: 1, ListingID: 3 },
  { WatchListID: 4, UserID: 1, ListingID: 5 },
  { WatchListID: 5, UserID: 1, ListingID: 7 },
  { WatchListID: 6, UserID: 2, ListingID: 4 },
  { WatchListID: 7, UserID: 2, ListingID: 6 },
  { WatchListID: 8, UserID: 2, ListingID: 8 },
]

export const WalletTransactions: WalletTransactionItem[] = [
  { TransactionID: 1, UserID: 1, TransactionType: 'top-up', Amount: 100, TransactionStatus: 'completed', Method: 'Credit Card', Created_at: '22 May 2026, 10:15' },
  { TransactionID: 2, UserID: 1, TransactionType: 'bid-hold', Amount: -145, TransactionStatus: 'completed', Method: 'Wallet', Created_at: '22 May 2026, 11:20' },
  { TransactionID: 3, UserID: 1, TransactionType: 'refund', Amount: 210, TransactionStatus: 'completed', Method: 'Wallet', Created_at: '21 May 2026, 16:45' },
  { TransactionID: 4, UserID: 1, TransactionType: 'withdrawal', Amount: -50, TransactionStatus: 'pending', Method: 'Bank Transfer', Created_at: '20 May 2026, 09:30' },
  { TransactionID: 5, UserID: 1, TransactionType: 'top-up', Amount: 250, TransactionStatus: 'completed', Method: 'PayNow', Created_at: '19 May 2026, 14:10' },
  { TransactionID: 6, UserID: 2, TransactionType: 'top-up', Amount: 500, TransactionStatus: 'completed', Method: 'Credit Card', Created_at: '22 May 2026, 12:00' },
  { TransactionID: 7, UserID: 2, TransactionType: 'withdrawal', Amount: -120, TransactionStatus: 'completed', Method: 'Bank Transfer', Created_at: '21 May 2026, 13:25' },
  { TransactionID: 8, UserID: 2, TransactionType: 'seller-credit', Amount: 350, TransactionStatus: 'completed', Method: 'Wallet', Created_at: '20 May 2026, 18:35' },
  { TransactionID: 9, UserID: 1, TransactionType: 'bid-hold', Amount: -85, TransactionStatus: 'completed', Method: 'Wallet', Created_at: '18 May 2026, 08:55' },
  { TransactionID: 10, UserID: 2, TransactionType: 'top-up', Amount: 75, TransactionStatus: 'failed', Method: 'PayNow', Created_at: '17 May 2026, 19:05' },
]