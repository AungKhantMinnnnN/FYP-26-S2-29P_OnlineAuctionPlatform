import { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import SectionHeader from '../components/SectionHeader';
import { getAuctions } from '../api/auctionsApi';

export default function CollectorBoardPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await getAuctions({ page: 1, size: 6, status: 'active' });
        setItems(data.items || []);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="max-w-6xl mx-auto px-6 py-8">
      <SectionHeader 
        title="Collector Board" 
        subtitle="Your curated grid of high-value targets." 
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <p className="col-span-3 text-center py-20">Loading board...</p>
        ) : items.length > 0 ? (
          items.map((item) => (
            <div key={item.id} className="bg-white dark:bg-slate-900 rounded-3xl overflow-hidden border border-slate-200 dark:border-slate-700 shadow-sm">
              <div className="aspect-[4/3] bg-slate-100 relative">
                <img 
                  src={item.images?.[0]?.image_url || ''} 
                  className="w-full h-full object-cover" 
                  alt={item.title} 
                />
              </div>
              <div className="bg-slate-900 text-white p-4">
                <h3 className="font-medium line-clamp-2">{item.title}</h3>
                <p className="text-lg font-semibold mt-1">
                  ${item.current_price?.toLocaleString() || item.starting_price}
                </p>
              </div>
            </div>
          ))
        ) : (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="aspect-[4/3] border-2 border-dashed border-slate-300 rounded-3xl flex flex-col items-center justify-center hover:border-blue-400 cursor-pointer bg-white dark:bg-slate-900">
              <Plus size={48} className="text-slate-400" />
              <p className="text-slate-500 mt-3">Add Target</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}