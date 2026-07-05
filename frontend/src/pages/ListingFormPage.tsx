import { useState } from 'react';
import { Upload, X, Plus } from 'lucide-react';
import SectionHeader from '../components/SectionHeader';
import PrimaryButton from '../components/PrimaryButton';
import { useNavigate } from 'react-router-dom';

export default function ListingFormPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1); // 1: Details, 2: Media, 3: Settings

  const [form, setForm] = useState({
    title: '',
    category: '',
    condition: '',
    description: '',
    startingPrice: '',
    reservePrice: '',
    duration: '7',
  });

  const [images, setImages] = useState<string[]>([]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Placeholder for image upload
    alert("Image upload coming soon!");
  };

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Create New Listing</h1>
        <button onClick={() => navigate(-1)} className="text-slate-400 hover:text-slate-600">✕</button>
      </div>

      <p className="text-slate-500 mb-8">Provide precise details to maximize your item's auction performance.</p>

      {/* Stepper */}
      <div className="flex items-center gap-3 mb-10">
        <div className={`flex-1 h-1 rounded-full ${step >= 1 ? 'bg-blue-600' : 'bg-slate-200'}`} />
        <div className={`flex-1 h-1 rounded-full ${step >= 2 ? 'bg-blue-600' : 'bg-slate-200'}`} />
        <div className={`flex-1 h-1 rounded-full ${step >= 3 ? 'bg-blue-600' : 'bg-slate-200'}`} />
      </div>

      {/* Step 1: Item Details */}
      {step === 1 && (
        <div className="space-y-6 bg-white p-8 rounded-3xl border">
          <div className="flex items-center gap-2 text-blue-600 font-medium">
            📋 Item Details
          </div>
          <input 
            type="text" 
            placeholder="e.g. Rare 1964 Vintage Chronograph" 
            className="w-full p-4 border rounded-2xl focus:outline-none focus:border-blue-500" 
            value={form.title}
            onChange={(e) => setForm({...form, title: e.target.value})}
          />

          <div className="grid grid-cols-2 gap-4">
            <select className="p-4 border rounded-2xl" value={form.category} onChange={(e) => setForm({...form, category: e.target.value})}>
              <option value="">Select a category</option>
              <option value="watches">Watches</option>
              <option value="electronics">Electronics</option>
            </select>
            <select className="p-4 border rounded-2xl" value={form.condition} onChange={(e) => setForm({...form, condition: e.target.value})}>
              <option value="">Select condition</option>
              <option value="new">New</option>
              <option value="excellent">Excellent</option>
            </select>
          </div>

          <textarea 
            placeholder="Describe the item's history, features, and unique qualities..." 
            className="w-full p-4 border rounded-2xl h-32" 
            value={form.description}
            onChange={(e) => setForm({...form, description: e.target.value})}
          />
        </div>
      )}

      {/* Step 2: Media Upload */}
      {step === 2 && (
        <div className="space-y-6 bg-white p-8 rounded-3xl border">
          <div className="flex items-center gap-2 text-blue-600 font-medium">
            📸 Media Upload
          </div>
          <div className="border-2 border-dashed border-slate-300 rounded-3xl p-12 text-center">
            <Upload size={48} className="mx-auto text-slate-400" />
            <p className="mt-4 font-medium">Drag and drop high-res images</p>
            <p className="text-sm text-slate-500">Min resolution: 2048 × 2048px. Maximum 12 photos.</p>
            <button className="mt-6 bg-blue-600 text-white px-8 py-3 rounded-2xl">Browse Files</button>
          </div>

          <div className="grid grid-cols-3 gap-4">
            {images.map((url, i) => (
              <div key={i} className="aspect-square border rounded-2xl overflow-hidden relative">
                <img src={url} alt="" className="w-full h-full object-cover" />
              </div>
            ))}
            <div className="aspect-square border-2 border-dashed border-slate-300 rounded-2xl flex items-center justify-center cursor-pointer">
              <Plus size={32} className="text-slate-400" />
            </div>
          </div>
        </div>
      )}

      {/* Step 3: Auction Settings */}
      {step === 3 && (
        <div className="space-y-6 bg-white p-8 rounded-3xl border">
          <div className="flex items-center gap-2 text-blue-600 font-medium">
            ⚙️ Auction Settings
          </div>

          <div className="p-4 bg-blue-50 rounded-2xl text-center">
            Timed Auction
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-slate-500">Starting Price (USD)</label>
              <input type="number" className="w-full p-4 border rounded-2xl mt-1" placeholder="$0.00" />
            </div>
            <div>
              <label className="text-sm text-slate-500">Reserve Price (Optional)</label>
              <input type="text" className="w-full p-4 border rounded-2xl mt-1" placeholder="Enter amount" />
            </div>
          </div>

          <div>
            <label className="text-sm text-slate-500 block mb-2">Auction Duration</label>
            <div className="flex gap-3">
              {[3,7,10,14].map(d => (
                <button key={d} className={`flex-1 py-3 rounded-2xl border ${form.duration === d.toString() ? 'border-blue-600 bg-blue-50' : 'border-slate-200'}`} onClick={() => setForm({...form, duration: d.toString()})}>
                  {d} Days
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex gap-4 mt-10">
        {step > 1 && <button onClick={() => setStep(step - 1)} className="flex-1 py-4 border rounded-2xl">Back</button>}
        <button onClick={() => step < 3 ? setStep(step + 1) : alert('Listing Published!')} className="flex-1 py-4 bg-blue-600 text-white rounded-2xl">
          {step === 3 ? 'Publish Auction' : 'Next'}
        </button>
      </div>
    </div>
  );
}