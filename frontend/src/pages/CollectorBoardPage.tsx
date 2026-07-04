import { useState, useEffect } from 'react';
import { Trophy, TrendingUp } from 'lucide-react';
import SectionHeader from '../components/SectionHeader';
import AuctionCard from '../components/AuctionCard';
import { getAuctions } from '../api/auctionsApi';

export default function CollectorBoardPage() {
  const [trendingAuctions, setTrendingAuctions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchTrending = async () => {
      try {
        const data = await getAuctions({ 
          page: 1, 
          size: 6, 
          status: 'active' 
        });
        
        // Sort by current price (highest first)
        const sorted = [...(data.items || [])].sort((a, b) => 
          (b.current_price || 0) - (a.current_price || 0)
        );
        
        setTrendingAuctions(sorted.slice(0, 6));
      } catch (err) {
        console.error("Failed to fetch trending auctions", err);
        setError("Failed to load trending auctions");
      } finally {
        setLoading(false);
      }
    };

    fetchTrending();
  }, []);

  const topCollectors = [
    { rank: 1, username: "VintageKing92", items: 47, value: "$12,450" },
    { rank: 2, username: "SneakerSage", items: 32, value: "$8,920" },
    { rank: 3, username: "TechCollectorSG", items: 28, value: "$15,670" },
  ];

  return (
    <div className="space-y-12">
      <SectionHeader 
        title="Collector Board" 
        subtitle="Top collectors & trending treasures this week" 
      />

      {/* Top Collectors */}
      <div>
        <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
          <Trophy className="text-amber-500" /> Top Collectors
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {topCollectors.map((collector) => (
            <div key={collector.rank} className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
              <div className="flex items-center gap-4">
                <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-2xl">
                  {collector.rank}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-lg">{collector.username}</p>
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    {collector.items} items • {collector.value}
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Trending Auctions */}
      <div>
        <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2">
          <TrendingUp className="text-blue-500" /> Trending This Week
        </h2>

        {loading ? (
          <p className="text-center py-12 text-slate-500">Loading trending auctions...</p>
        ) : error ? (
          <p className="text-center py-12 text-red-500">{error}</p>
        ) : trendingAuctions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trendingAuctions.map((auction) => (
              <AuctionCard key={auction.id} auction={auction} />
            ))}
          </div>
        ) : (
          <p className="text-center py-12 text-slate-500">
            No trending auctions available at the moment.
          </p>
        )}
      </div>
    </div>
  );
}