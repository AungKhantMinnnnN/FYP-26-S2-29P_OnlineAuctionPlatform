import { useState } from 'react';
import { Upload, X } from 'lucide-react';
import SectionHeader from '../components/SectionHeader';
import PrimaryButton from '../components/PrimaryButton';

export default function ListingFormPage() {
  const [form, setForm] = useState({
    title: '',
    description: '',
    starting_price: '',
    reserve_price: '',
    end_time: '',
    condition: 'new'
  });

  const [images, setImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const files = Array.from(e.target.files);
      setImages(prev => [...prev, ...files]);
      
      const urls = files.map(file => URL.createObjectURL(file));
      setPreviewUrls(prev => [...prev, ...urls]);
    }
  };

  const removeImage = (index: number) => {
    setImages(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => {
      URL.revokeObjectURL(prev[index]);
      return prev.filter((_, i) => i !== index);
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert("Listing created successfully! (Wireframe mode)");
  };

  return (
    <div className="max-w-3xl mx-auto">
      <SectionHeader 
        title="Create New Listing" 
        subtitle="Share something special with the community" 
      />

      <form onSubmit={handleSubmit} className="space-y-8 rounded-3xl border border-slate-200 bg-white p-8 dark:border-slate-800 dark:bg-slate-900">
        
        <div>
          <label className="block text-sm font-medium mb-2">Title</label>
          <input
            type="text"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-700"
            placeholder="Vintage Mechanical Keyboard"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2">Description</label>
          <textarea
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            rows={6}
            className="w-full rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-700"
            placeholder="Describe your item in detail..."
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2">Starting Price ($)</label>
            <input 
              type="number" 
              value={form.starting_price} 
              onChange={(e) => setForm({ ...form, starting_price: e.target.value })} 
              className="w-full rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-700" 
              required 
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Reserve Price ($)</label>
            <input 
              type="number" 
              value={form.reserve_price} 
              onChange={(e) => setForm({ ...form, reserve_price: e.target.value })} 
              className="w-full rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-700" 
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium mb-2">End Date</label>
            <input 
              type="datetime-local" 
              value={form.end_time} 
              onChange={(e) => setForm({ ...form, end_time: e.target.value })} 
              className="w-full rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-700" 
              required 
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Condition</label>
            <select 
              value={form.condition} 
              onChange={(e) => setForm({ ...form, condition: e.target.value })} 
              className="w-full rounded-xl border border-slate-200 px-4 py-3 dark:border-slate-700"
            >
              <option value="new">New</option>
              <option value="used">Used</option>
              <option value="refurbished">Refurbished</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium mb-3">Photos (max 6)</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {previewUrls.map((url, idx) => (
              <div key={idx} className="relative aspect-square rounded-2xl overflow-hidden border border-slate-200">
                <img src={url} alt="preview" className="w-full h-full object-cover" />
                <button 
                  type="button" 
                  onClick={() => removeImage(idx)} 
                  className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-1 hover:bg-red-600"
                >
                  <X size={16} />
                </button>
              </div>
            ))}
            
            {previewUrls.length < 6 && (
              <label className="aspect-square border-2 border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-accent-400 transition-colors">
                <Upload size={32} className="text-slate-400" />
                <span className="text-xs mt-2 text-slate-500">Add Photo</span>
                <input 
                  type="file" 
                  multiple 
                  accept="image/*" 
                  onChange={handleImageChange} 
                  className="hidden" 
                />
              </label>
            )}
          </div>
        </div>

        <PrimaryButton type="submit" fullWidth>
          Publish Auction
        </PrimaryButton>
      </form>
    </div>
  );
}