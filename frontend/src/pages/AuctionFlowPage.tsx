import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { getMyListings } from '../api/auctionsApi';
import { useNavigate } from 'react-router-dom';

export default function SellerDashboardPage() {
  const navigate = useNavigate();
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchListings = async () => {
      try {
        const data = await getMyListings({ page: 1, size: 10 });
        setListings(data.items || []);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchListings();
  }, []);

  return (
    <div className="max-w-7xl mx-auto p-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Listing History</h1>
          <p className="text-slate-500">Manage and track your auction inventory and sales performance.</p>
        </div>
        <button 
          onClick={() => navigate('/create-listing')}
          className="bg-blue-600 text-white px-6 py-3 rounded-2xl flex items-center gap-2 hover:bg-blue-700"
        >
          <Plus size={20} /> Create New Listing
        </button>
      </div>

      {/* Stats - Still hardcoded for now (can be improved later) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <div className="bg-white border border-slate-200 rounded-3xl p-6">
          <div className="flex items-center gap-2 text-sm text-slate-500">👁 TOTAL VIEWS</div>
          <div className="text-4xl font-bold mt-2">12.4k</div>
          <div className="text-green-600 text-sm mt-1">↑14% this month</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-6">
          <div className="flex items-center gap-2 text-sm text-slate-500">❤️ WATCHERS</div>
          <div className="text-4xl font-bold mt-2">842</div>
          <div className="text-slate-500 text-sm mt-1">Across 12 active items</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-6">
          <div className="flex items-center gap-2 text-sm text-slate-500">💰 SALES VOLUME</div>
          <div className="text-4xl font-bold mt-2">$42.8k</div>
          <div className="text-slate-500 text-sm mt-1">YTD Revenue</div>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-6 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-50">
          <div className="text-blue-600 text-3xl">📈</div>
          <div className="text-sm font-medium mt-3">View Full Analytics</div>
        </div>
      </div>

      {/* Table - Real data from backend */}
      <div className="bg-white rounded-3xl overflow-hidden border">
        <table className="w-full">
          <thead className="bg-slate-50">
            <tr className="text-left text-xs uppercase tracking-wider text-slate-500">
              <th className="px-6 py-4">ITEM</th>
              <th className="px-6 py-4">CURRENT BID / PRICE</th>
              <th className="px-6 py-4">BIDS</th>
              <th className="px-6 py-4">TIME LEFT</th>
              <th className="px-6 py-4">STATUS</th>
              <th className="px-6 py-4">ACTIONS</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {loading ? (
              <tr><td colSpan={6} className="text-center py-12">Loading your listings...</td></tr>
            ) : listings.length > 0 ? (
              listings.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-6 py-4 flex items-center gap-4">
                    <img src={item.images?.[0]?.image_url || ''} className="w-12 h-12 object-cover rounded" alt="" />
                    <div>
                      <div className="font-medium">{item.title}</div>
                    </div>
                  </td>
                  <td className="px-6 py-4 font-medium">
                    ${item.current_price?.toLocaleString() || item.starting_price}
                  </td>
                  <td className="px-6 py-4">{item.bids?.length || 0}</td>
                  <td className="px-6 py-4 text-red-600">04:12:45</td>
                  <td className="px-6 py-4">
                    <span className="px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs">LIVE</span>
                  </td>
                  <td className="px-6 py-4 text-slate-400">⋯</td>
                </tr>
              ))
            ) : (
              <tr><td colSpan={6} className="text-center py-12 text-slate-500">No listings found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}