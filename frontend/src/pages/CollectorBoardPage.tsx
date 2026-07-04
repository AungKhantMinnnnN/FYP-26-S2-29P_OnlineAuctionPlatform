import { Trophy } from 'lucide-react';
import SectionHeader from '../components/SectionHeader';

const topCollectors = [
  { id: 1, name: "VintageKing92", items: 47, value: "$12,450" },
  { id: 2, name: "SneakerSage", items: 32, value: "$8,920" },
  { id: 3, name: "TechCollectorSG", items: 28, value: "$15,670" }
];

export default function CollectorBoardPage() {
  return (
    <div className="space-y-10">
      <SectionHeader 
        title="Collector Board" 
        subtitle="Top collectors & trending treasures this week" 
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {topCollectors.map((collector, index) => (
          <div key={collector.id} className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white font-bold text-xl">
                {index + 1}
              </div>
              <div>
                <p className="font-semibold">{collector.name}</p>
                <p className="text-sm text-slate-500 dark:text-slate-400">{collector.items} items • {collector.value}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900">
        <SectionHeader title="Trending This Week" subtitle="Hot items being collected right now" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
          {/* Add AuctionCard components here later */}
          <p className="text-slate-500 dark:text-slate-400 col-span-full text-center py-12">
            Trending auctions will appear here
          </p>
        </div>
      </div>
    </div>
  );
}