import { useState, useEffect } from 'react';
import { Upload, X, Save } from 'lucide-react';
import FormInput from '../components/FormInput';
import SelectField from '../components/SelectField';
import TextAreaField from '../components/TextAreaField';
import DatePickerField from '../components/DatePickerField';
import PrimaryButton from '../components/PrimaryButton';
import SecondaryButton from '../components/SecondaryButton';
import { useAuth } from '../context/AuthContext';
import { createListing, uploadAuctionImages, getFormMetadata } from '../api/auctionsApi';
import Modal from '../components/Modal';
import { CheckCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ListingFormPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category_id: '',
    condition: 'new',
    bidding_type: 'price_up',
    starting_price: '',
    reserve_price: '',
    min_increment: '5',
    start_time: '',
    end_time: '',
  });

  const [images, setImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [metadataLoading, setMetadataLoading] = useState(true);
  
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [createdListingId, setCreatedListingId] = useState('');

  const [categories, setCategories] = useState<any[]>([]);
  const [conditions, setConditions] = useState<any[]>([]);
  const [biddingTypes, setBiddingTypes] = useState<any[]>([]);

  // Load metadata from backend
  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const data = await getFormMetadata();
        setCategories(data.categories || []);
        setConditions(data.conditions || []);
        setBiddingTypes(data.biddingTypes || []);

        // Auto select first options
        if (data.categories?.length > 0) setFormData(p => ({ ...p, category_id: data.categories[0].id }));
        if (data.conditions?.length > 0) setFormData(p => ({ ...p, condition: data.conditions[0].id }));
        if (data.biddingTypes?.length > 0) setFormData(p => ({ ...p, bidding_type: data.biddingTypes[0].id }));

        const now = new Date();
        const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

        setFormData(p => ({
          ...p,
          start_time: p.start_time || now.toISOString().slice(0, 16),
          end_time: p.end_time || nextWeek.toISOString().slice(0, 16)
        }));
      } catch (error) {
        console.error("Failed to load metadata", error);
      } finally {
        setMetadataLoading(false);
      }
    };

    fetchMetadata();
  }, []);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const newImages = [...images, ...files].slice(0, 4);
    setImages(newImages);

    const newPreviews = files.map(file => URL.createObjectURL(file));
    setPreviewUrls(prev => [...prev, ...newPreviews].slice(0, 4));
  };

  const removeImage = (index: number) => {
    URL.revokeObjectURL(previewUrls[index]);
    setImages(prev => prev.filter((_, i) => i !== index));
    setPreviewUrls(prev => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = async (e: React.FormEvent, isDraft = false) => {
    e.preventDefault();
    if (!user) return alert("Please log in first");

    setIsLoading(true);

    const payload = {
      title: formData.title,
      description: formData.description,
      condition: formData.condition,
      bidding_type: formData.bidding_type,
      starting_price: Number(formData.starting_price),
      reserve_price: formData.reserve_price ? Number(formData.reserve_price) : undefined,
      min_increment: Number(formData.min_increment) || 1,
      start_time: new Date(formData.start_time).toISOString(),
      end_time: new Date(formData.end_time).toISOString(),
      category_id: formData.category_id || null,
      status: isDraft ? 'draft' : 'active',
    };

    try {
      const result = await createListing(payload);
      
      if (images.length > 0) {
        await uploadAuctionImages(result.id, images);
      }

      setCreatedListingId(result.id);
      setSuccessModalOpen(true);
    } catch (error: any) {
      console.error(error);
      alert(error.response?.data?.detail || "Failed to create listing. Please check your input.");
    } finally {
      setIsLoading(false);
    }
  };

  if (metadataLoading) {
    return <div className="text-center py-20 text-slate-500">Loading form data...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto p-4">
      <Modal isOpen={successModalOpen} onClose={() => navigate('/browse')}>
        <div className="text-center py-8">
          <CheckCircle2 className="mx-auto h-16 w-16 text-green-500 mb-4" />
          <h2 className="text-2xl font-bold mb-2">Listing Created Successfully!</h2>
          <p className="text-slate-500 mb-6">Your item is now live on the marketplace.</p>
          <PrimaryButton onClick={() => navigate(`/auction/${createdListingId}`)} fullWidth>
            View My Listing
          </PrimaryButton>
        </div>
      </Modal>

      <h1 className="text-3xl font-bold mb-1">Create New Listing</h1>
      <p className="text-slate-500 mb-8">Share something special with the community</p>

      <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6 bg-white dark:bg-slate-900 p-8 rounded-3xl border border-slate-200 dark:border-slate-800">
        
        <FormInput
          label="Title"
          placeholder="e.g. iPhone 17 Pro 256GB"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          required
        />

        <TextAreaField
          label="Description"
          placeholder="Describe the item condition, history, and any defects..."
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={5}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SelectField
            label="Category"
            options={categories.map(c => c.name)}
            value={categories.find(c => c.id === formData.category_id)?.name || ''}
            onChange={(e) => {
              const cat = categories.find(c => c.name === e.target.value);
              setFormData({ ...formData, category_id: cat ? cat.id : '' });
            }}
          />
          <SelectField
            label="Condition"
            options={conditions.map(c => c.name)}
            value={conditions.find(c => c.id === formData.condition)?.name || ''}
            onChange={(e) => {
              const cond = conditions.find(c => c.name === e.target.value);
              setFormData({ ...formData, condition: cond ? cond.id : '' });
            }}
          />
          <SelectField
            label="Bidding Type"
            options={biddingTypes.map(b => b.name)}
            value={biddingTypes.find(b => b.id === formData.bidding_type)?.name || ''}
            onChange={(e) => {
              const btype = biddingTypes.find(b => b.name === e.target.value);
              setFormData({ ...formData, bidding_type: btype ? btype.id : '' });
            }}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormInput label="Starting Price ($)" type="number" value={formData.starting_price} onChange={(e) => setFormData({ ...formData, starting_price: e.target.value })} required />
          <FormInput label="Reserve Price ($)" type="number" value={formData.reserve_price} onChange={(e) => setFormData({ ...formData, reserve_price: e.target.value })} />
          <FormInput label="Min Increment ($)" type="number" value={formData.min_increment} onChange={(e) => setFormData({ ...formData, min_increment: e.target.value })} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DatePickerField 
            label="Start Time" 
            selected={formData.start_time ? new Date(formData.start_time) : null} 
            onChange={(date) => setFormData({ ...formData, start_time: date ? date.toISOString().slice(0,16) : '' })} 
          />
          <DatePickerField 
            label="End Time" 
            selected={formData.end_time ? new Date(formData.end_time) : null} 
            onChange={(date) => setFormData({ ...formData, end_time: date ? date.toISOString().slice(0,16) : '' })} 
            minDate={formData.start_time ? new Date(formData.start_time) : undefined} 
          />
        </div>

        {/* Image Upload */}
        <div>
          <label className="block text-sm font-medium mb-3">Images (Max 4)</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {previewUrls.map((url, i) => (
              <div key={i} className="relative aspect-square rounded-2xl overflow-hidden border border-slate-200">
                <img src={url} alt="preview" className="w-full h-full object-cover" />
                <button type="button" onClick={() => removeImage(i)} className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full hover:bg-red-600">
                  <X size={16} />
                </button>
              </div>
            ))}

            {previewUrls.length < 4 && (
              <label className="aspect-square border-2 border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-500">
                <Upload size={32} className="text-slate-400" />
                <span className="text-xs text-slate-500 mt-2">Add Image</span>
                <input type="file" multiple accept="image/*" className="hidden" onChange={handleImageChange} />
              </label>
            )}
          </div>
        </div>

        <div className="flex gap-3 pt-6">
          <SecondaryButton type="button" onClick={(e) => handleSubmit(e, true)} disabled={isLoading}>
            <Save className="mr-2" size={18} /> Save as Draft
          </SecondaryButton>
          <PrimaryButton type="submit" disabled={isLoading}>
            <Upload className="mr-2" size={18} />
            {isLoading ? 'Publishing...' : 'Publish Listing'}
          </PrimaryButton>
        </div>
      </form>
    </div>
  );
}