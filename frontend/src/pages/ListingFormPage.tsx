import { useState } from 'react';
import { Image, Save, Upload, X } from 'lucide-react';
import FormInput from '../components/FormInput';
import SelectField from '../components/SelectField';
import TextAreaField from '../components/TextAreaField';
import PrimaryButton from '../components/PrimaryButton';
import SecondaryButton from '../components/SecondaryButton';
import { useAuth } from '../context/AuthContext';
import { createListing } from '../api/auctionsApi';

const categories = ['Electronics', 'Fashion', 'Collectibles', 'Home & Garden', 'Others'];
const conditions = ['new', 'refurbished', 'used'];

export default function ListingFormPage() {
  const { user } = useAuth();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category_id: '',
    condition: 'new',
    bidding_type: 'price_up',
    starting_price: '',
    reserve_price: '',
    min_increment: '5',
    start_time: new Date().toISOString().slice(0, 16),
    end_time: '',
  });

  const [images, setImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Title validation
    if (!formData.title.trim()) newErrors.title = "Title is required";

    // Starting Price validation
    const startPrice = Number(formData.starting_price);
    if (!formData.starting_price || startPrice <= 0) {
      newErrors.starting_price = "Starting price must be greater than 0";
    }

    // Reserve Price validation (Key requirement for this use case)
    const reservePrice = Number(formData.reserve_price);
    if (formData.reserve_price && reservePrice < startPrice) {
      newErrors.reserve_price = "Reserve price must be equal to or higher than starting price";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setImages([...images, ...files].slice(0, 4));

    const newPreviews = files.map(file => URL.createObjectURL(file));
    setPreviewUrls([...previewUrls, ...newPreviews].slice(0, 4));
  };

  const removeImage = (index: number) => {
    URL.revokeObjectURL(previewUrls[index]);
    setImages(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent, isDraft = false) => {
    e.preventDefault();
    if (!user) return alert("Please log in first");

    if (!validateForm()) return;

    setIsLoading(true);

    const payload = new FormData();
    payload.append('title', formData.title);
    payload.append('description', formData.description || '');
    payload.append('condition', formData.condition);
    payload.append('bidding_type', formData.bidding_type);
    payload.append('starting_price', formData.starting_price);
    payload.append('reserve_price', formData.reserve_price || formData.starting_price);
    payload.append('min_increment', formData.min_increment);
    payload.append('start_time', new Date(formData.start_time).toISOString());
    payload.append('end_time', new Date(formData.end_time || Date.now() + 7*24*60*60*1000).toISOString());
    payload.append('status', isDraft ? 'draft' : 'active');

    if (formData.category_id) payload.append('category_id', formData.category_id);

    images.forEach(file => payload.append('images', file));

    try {
      const result = await createListing(payload);
      alert(`✅ Listing created successfully!\nID: ${result.id}`);
      window.location.reload();
    } catch (error: any) {
      alert(error.response?.data?.detail || 'Failed to create listing');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6 p-4">
      <div>
        <h1 className="text-3xl font-bold">Create New Listing</h1>
        <p className="text-slate-500">Set your minimum acceptable selling price (Reserve Price).</p>
      </div>

      <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6 bg-white p-8 rounded-2xl border">
        
        <FormInput
          label="Title"
          placeholder="e.g. iPhone 17 Pro 256GB"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          error={errors.title}
          required
        />

        <TextAreaField
          label="Description"
          placeholder="Describe the item..."
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SelectField label="Category" options={categories} value={formData.category_id} onChange={(e) => setFormData({ ...formData, category_id: e.target.value })} />
          <SelectField label="Condition" options={conditions} value={formData.condition} onChange={(e) => setFormData({ ...formData, condition: e.target.value })} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormInput
            label="Starting Price ($)"
            type="number"
            step="0.01"
            min="0.01"
            value={formData.starting_price}
            onChange={(e) => setFormData({ ...formData, starting_price: e.target.value })}
            error={errors.starting_price}
            required
          />
          <FormInput
            label="Reserve Price ($)"
            type="number"
            step="0.01"
            min="0.01"
            value={formData.reserve_price}
            onChange={(e) => setFormData({ ...formData, reserve_price: e.target.value })}
            error={errors.reserve_price}
            required
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormInput label="Minimum Increment ($)" type="number" value={formData.min_increment} onChange={(e) => setFormData({ ...formData, min_increment: e.target.value })} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormInput label="Start Time" type="datetime-local" value={formData.start_time} onChange={(e) => setFormData({ ...formData, start_time: e.target.value })} />
          <FormInput label="End Time" type="datetime-local" value={formData.end_time} onChange={(e) => setFormData({ ...formData, end_time: e.target.value })} />
        </div>

        {/* Image Upload */}
        <div>
          <label className="block text-sm font-medium mb-3">Images (Max 4)</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {previewUrls.map((url, i) => (
              <div key={i} className="relative aspect-square rounded-2xl overflow-hidden border">
                <img src={url} alt="preview" className="w-full h-full object-cover" />
                <button type="button" onClick={() => removeImage(i)} className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full">
                  <X size={16} />
                </button>
              </div>
            ))}
            {previewUrls.length < 4 && (
              <label className="aspect-square border-2 border-dashed rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-500">
                <Image size={32} className="text-slate-400" />
                <span className="text-xs text-slate-500 mt-1">Add Image</span>
                <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageChange} />
              </label>
            )}
          </div>
        </div>

        <div className="flex gap-3 pt-6">
          <SecondaryButton 
            type="button" 
            onClick={() => handleSubmit({ preventDefault: () => {} } as any, true)}
            disabled={isLoading}
          >
            <Save size={18} className="mr-2" /> Save Draft
          </SecondaryButton>

          <PrimaryButton type="submit" disabled={isLoading}>
            <Upload size={18} className="mr-2" />
            {isLoading ? 'Publishing...' : 'Publish Listing'}
          </PrimaryButton>
        </div>
      </form>
    </div>
  );
}