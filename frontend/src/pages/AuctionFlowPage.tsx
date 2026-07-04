import { useState, useEffect } from 'react';
import { Clock, Users, Trophy, ArrowRight } from 'lucide-react';
import SectionHeader from '../components/SectionHeader';
import PrimaryButton from '../components/PrimaryButton';
import { getAuctions } from '../api/auctionsApi'; // Adjust import if needed

export default function AuctionFlowPage() {
  const [stats, setStats] = useState({
    activeAuctions: 0,
    totalBids: 0,
    totalUsers: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        // Example: Fetch active auctions count
        const auctionsData = await getAuctions({ page: 1, size: 1 });
        setStats({
          activeAuctions: auctionsData.total || 0,
          totalBids: 12480,     // You can create a backend endpoint for real stats later
          totalUsers: 3420,
        });
      } catch (error) {
        console.error("Failed to load stats", error);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, []);

  const flowSteps = [
    { id: 1, icon: Users, title: "Browse & Discover", desc: "Explore thousands of unique items from real sellers" },
    { id: 2, icon: Clock, title: "Place Your Bid", desc: "Real-time bidding with live updates and notifications" },
    { id: 3, icon: Trophy, title: "Win & Pay", desc: "Secure checkout and instant ownership transfer" }
  ];

  return (
    <div className="space-y-12">
      <SectionHeader 
        title="How Auctions Work" 
        subtitle="Simple, transparent, and exciting — from discovery to delivery" 
      />

      {/* Live Stats */}
      <div className="grid grid-cols-3 gap-6 text-center">
        <div className="rounded-2xl bg-slate-100 dark:bg-slate-800 p-6">
          <p className="text-4xl font-bold text-accent-600">{loading ? "..." : stats.activeAuctions}</p>
          <p className="text-sm text-slate-500">Active Auctions</p>
        </div>
        <div className="rounded-2xl bg-slate-100 dark:bg-slate-800 p-6">
          <p className="text-4xl font-bold text-accent-600">{stats.totalBids.toLocaleString()}</p>
          <p className="text-sm text-slate-500">Total Bids Today</p>
        </div>
        <div className="rounded-2xl bg-slate-100 dark:bg-slate-800 p-6">
          <p className="text-4xl font-bold text-accent-600">{stats.totalUsers.toLocaleString()}</p>
          <p className="text-sm text-slate-500">Happy Collectors</p>
        </div>
      </div>

      {/* Steps */}
      <div className="flex justify-center gap-6">
        {flowSteps.map((s, idx) => (
          <button
            key={s.id}
            onClick={() => {}} // You can add step logic later
            className="flex h-14 w-14 items-center justify-center rounded-full border-4 border-accent-600 text-2xl font-bold text-accent-600"
          >
            {idx + 1}
          </button>
        ))}
      </div>

      <div className="grid gap-8 md:grid-cols-3">
        {flowSteps.map((s) => {
          const Icon = s.icon;
          return (
            <div key={s.id} className="rounded-3xl border border-slate-200 p-8 dark:border-slate-700">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-accent-100 text-accent-600 dark:bg-accent-900">
                <Icon size={36} />
              </div>
              <h3 className="mb-3 text-2xl font-semibold">{s.title}</h3>
              <p className="text-slate-600 dark:text-slate-400">{s.desc}</p>
            </div>
          );
        })}
      </div>

      <div className="flex justify-center pt-6">
        <PrimaryButton to="/browse">
          Start Exploring Auctions <ArrowRight className="ml-2" />
        </PrimaryButton>
      </div>
    </div>
  );
}