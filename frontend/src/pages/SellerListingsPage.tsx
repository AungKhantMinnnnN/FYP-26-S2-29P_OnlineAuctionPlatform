import { useState, useEffect } from 'react';
import { Plus, Eye, Pencil, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { getMyListings } from '../api/auctionsApi';
import type { AuctionListing } from '../api/auctionsApi';
import { useAuth } from '../context/AuthContext';
import PrimaryButton from '../components/PrimaryButton';

export default function SellersListingPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [listings, setListings] = useState<AuctionListing[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchListings = async () => {
      try {
        const data = await getMyListings();
        setListings(data);
      } catch (err: any) {
        setError(err.response?.data?.detail || 'Failed to load your listings');
      } finally {
        setIsLoading(false);
      }
    };

    if (user) fetchListings();
  }, [user]);

  const formatPrice = (value?: number) =>
    value != null ? `$${value.toFixed(2)}` : '-';

  const statusClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-green-100 text-green-700';
      case 'draft':
        return 'bg-slate-100 text-slate-600';
      case 'ended':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-slate-100 text-slate-600';
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 p-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">My Listings</h1>
          <p className="text-slate-500">Track and manage the items you have posted.</p>
        </div>
        <PrimaryButton type="button" onClick={() => navigate('/create-listing')}>
          <Plus size={18} className="mr-2" /> Create Listing
        </PrimaryButton>
      </div>

      {/* States */}
      {isLoading && (
        <div className="text-center text-slate-500 py-12">Loading your listings...</div>
      )}

      {error && !isLoading && (
        <div className="text-center text-red-600 py-12">{error}</div>
      )}

      {!isLoading && !error && listings.length === 0 && (
        <div className="text-center text-slate-500 py-12">
          You haven't posted any listings yet.
        </div>
      )}

      {/* Table */}
      {!isLoading && !error && listings.length > 0 && (
        <div className="overflow-x-auto rounded-2xl border bg-white">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Title</th>
                <th className="px-4 py-3 font-medium">Category</th>
                <th className="px-4 py-3 font-medium">Current Bid</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {listings.map((item) => (
                <tr key={item.id} className="border-t border-slate-100">
                  <td className="px-4 py-3 font-medium text-slate-800">{item.title}</td>
                  <td className="px-4 py-3 text-slate-600">{item.category_id || '-'}</td>
                  <td className="px-4 py-3 text-slate-800">
                    {formatPrice(item.current_price ?? item.starting_price)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${statusClass(
                        item.status
                      )}`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => navigate(`/auction/${item.id}`)}
                        className="p-2 text-slate-500 hover:text-blue-600"
                        title="View"
                      >
                        <Eye size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => navigate(`/edit-listing/${item.id}`)}
                        className="p-2 text-slate-500 hover:text-amber-600"
                        title="Edit"
                      >
                        <Pencil size={16} />
                      </button>
                      <button
                        type="button"
                        className="p-2 text-slate-500 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}