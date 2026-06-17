import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { getAuctions } from '../api/auctionsApi';

export default function SellerDashboardPage() {
  const { user } = useAuth();
  const [myListings, setMyListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadMyListings();
  }, [user]);

  const loadMyListings = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const data = await getAuctions({ page: 1, size: 20 });
      // Filter listings belonging to current seller
      const sellerListings = data.items.filter((item: any) => item.seller_id === user.id);
      setMyListings(sellerListings);
    } catch (error) {
      console.error("Failed to load listings", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Seller Dashboard</h1>
          <p className="text-slate-500">Manage listings, track sales, and monitor performance.</p>
        </div>
        <button
          onClick={() => window.location.href = '/create-listing'}
          className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-xl flex items-center gap-2"
        >
          <span>+</span> Create Listing
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <div className="bg-[#1F2937] p-6 rounded-2xl">
          <div className="flex justify-between">
            <div>
              <p className="text-slate-400 text-sm">Active Listings</p>
              <p className="text-4xl font-bold mt-2">{myListings.filter(l => l.status === 'active').length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center">📦</div>
          </div>
        </div>
        {/* Add more stat cards as needed */}
      </div>

      {/* My Listings Section */}
      <div className="bg-[#1F2937] rounded-3xl p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-semibold">My Listings</h2>
          <button 
            onClick={() => window.location.href = '/create-listing'}
            className="text-blue-400 hover:text-blue-300 text-sm font-medium"
          >
            View All →
          </button>
        </div>

        {loading ? (
          <p>Loading your listings...</p>
        ) : myListings.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <div className="text-6xl mb-4">📭</div>
            <p>No listings yet</p>
            <button 
              onClick={() => window.location.href = '/create-listing'}
              className="mt-4 bg-blue-600 text-white px-8 py-3 rounded-2xl"
            >
              Create Your First Listing
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {myListings.slice(0, 6).map((listing: any) => (
              <div key={listing.id} className="bg-[#111827] rounded-2xl p-4 hover:scale-105 transition-transform">
                <img 
                  src={listing.images?.[0]?.image_url || 'https://via.placeholder.com/300'} 
                  alt={listing.title}
                  className="w-full h-40 object-cover rounded-xl mb-4"
                />
                <h3 className="font-medium line-clamp-2">{listing.title}</h3>
                <div className="mt-3 text-sm flex justify-between">
                  <span className="text-slate-400">Current Bid</span>
                  <span className="font-semibold">${listing.current_price}</span>
                </div>
                <div className={`mt-2 inline-block px-3 py-1 text-xs rounded-full ${
                  listing.status === 'active' ? 'bg-green-500/20 text-green-400' : 'bg-slate-500/20 text-slate-400'
                }`}>
                  {listing.status}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}