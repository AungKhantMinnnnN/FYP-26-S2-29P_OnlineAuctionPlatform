import { useState } from 'react';
import { Image, Save, Upload, X } from 'lucide-react';
import FormInput from '../components/FormInput';
import SelectField from '../components/SelectField';
import TextAreaField from '../components/TextAreaField';
import DatePickerField from '../components/DatePickerField';
import PrimaryButton from '../components/PrimaryButton';
import SecondaryButton from '../components/SecondaryButton';
import { useAuth } from '../context/AuthContext';
import { createListing, uploadAuctionImages, getFormMetadata, type Category, type EnumType } from '../api/auctionsApi';
import { useEffect } from 'react';
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
    status: 'active',
  });

  const [images, setImages] = useState<File[]>([]);
  const [previewUrls, setPreviewUrls] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [metadataLoading, setMetadataLoading] = useState(true);
  
  const [successModalOpen, setSuccessModalOpen] = useState(false);
  const [createdListingId, setCreatedListingId] = useState('');

  const [categories, setCategories] = useState<Category[]>([]);
  const [conditions, setConditions] = useState<EnumType[]>([]);
  const [biddingTypes, setBiddingTypes] = useState<EnumType[]>([]);

  useEffect(() => {
    const fetchMetadata = async () => {
      try {
        const data = await getFormMetadata();
        setCategories(data.categories);
        setConditions(data.conditions);
        setBiddingTypes(data.biddingTypes);
        
        // Auto-select first item if exists and not already selected
        if (data.categories.length > 0) {
          setFormData(prev => ({ ...prev, category_id: data.categories[0].id }));
        }
        if (data.conditions.length > 0) {
          setFormData(prev => ({ ...prev, condition: data.conditions[0].id }));
        }
        if (data.biddingTypes.length > 0) {
          setFormData(prev => ({ ...prev, bidding_type: data.biddingTypes[0].id }));
        }

        const now = new Date();
        const nextWeek = new Date(now.getTime() + 7 * 86400000);
        
        setFormData(prev => ({
          ...prev,
          start_time: prev.start_time || now.toISOString(),
          end_time: prev.end_time || nextWeek.toISOString()
        }));
      } catch (error) {
        console.error("Failed to load form metadata", error);
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

  const handleSubmit = async (e: React.FormEvent | React.MouseEvent, isDraft: boolean = false) => {
    e.preventDefault();
    if (!user) {
      alert("Please log in first");
      return;
    }

    setIsLoading(true);

    const startPriceNum = Number(formData.starting_price);
    const reservePriceNum = formData.reserve_price ? Number(formData.reserve_price) : startPriceNum;

    if (reservePriceNum < startPriceNum) {
      alert("Error: Reserve price cannot be lower than the starting price.");
      setIsLoading(false);
      return;
    }

    const payload = {
      title: formData.title,
      description: formData.description,
      condition: formData.condition,
      bidding_type: formData.bidding_type,
      starting_price: startPriceNum,
      reserve_price: reservePriceNum,
      min_increment: formData.min_increment ? Number(formData.min_increment) : 1,
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
      const detail = error.response?.data?.detail;
      if (Array.isArray(detail)) {
        // Extract the specific message from the first Pydantic validation error
        alert(`Validation Error: ${detail[0].msg}`);
      } else {
        alert(detail || "Failed to create listing. Please check all fields.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  if (metadataLoading) {
    return <div className="text-center py-20 text-slate-500">Loading form...</div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 p-4">
      <Modal isOpen={successModalOpen} onClose={() => navigate('/auctions')}>
        <div className="text-center py-6">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900 mb-4">
            <CheckCircle2 className="h-10 w-10 text-green-600 dark:text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Listing Published!</h2>
          <p className="text-slate-500 mb-8">
            Your auction has been successfully created and is now live on the marketplace.
          </p>
          <div className="flex flex-col gap-3">
            <PrimaryButton onClick={() => navigate(`/auction/${createdListingId}`)} fullWidth>
              View Listing
            </PrimaryButton>
            <SecondaryButton onClick={() => {
              setSuccessModalOpen(false);
              window.location.reload();
            }} fullWidth>
              Create Another
            </SecondaryButton>
          </div>
        </div>
      </Modal>

      <div>
        <h1 className="text-3xl font-bold tracking-tight">Create New Listing</h1>
        <p className="text-slate-500">Fill in the details to list your item for auction.</p>
      </div>

      <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-6 p-8 rounded-2xl">
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
              const selectedName = e.target.value;
              const cat = categories.find(c => c.name === selectedName);
              setFormData({ ...formData, category_id: cat ? cat.id : '' })
            }}
          />
          <SelectField
            label="Condition"
            options={conditions.map(c => c.name)}
            value={conditions.find(c => c.id === formData.condition)?.name || ''}
            onChange={(e) => {
              const selectedName = e.target.value;
              const cond = conditions.find(c => c.name === selectedName);
              setFormData({ ...formData, condition: cond ? cond.id : '' })
            }}
          />
          <SelectField
            label="Bidding Type"
            options={biddingTypes.map(b => b.name)}
            value={biddingTypes.find(b => b.id === formData.bidding_type)?.name || ''}
            onChange={(e) => {
              const selectedName = e.target.value;
              const btype = biddingTypes.find(b => b.name === selectedName);
              setFormData({ ...formData, bidding_type: btype ? btype.id : '' })
            }}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormInput
            label="Starting Price ($)"
            type="number"
            value={formData.starting_price}
            onChange={(e) => setFormData({ ...formData, starting_price: e.target.value })}
            required
          />
          <FormInput
            label="Reserve Price ($)"
            type="number"
            value={formData.reserve_price}
            onChange={(e) => setFormData({ ...formData, reserve_price: e.target.value })}
          />
          <FormInput
            label="Min Increment ($)"
            type="number"
            value={formData.min_increment}
            onChange={(e) => setFormData({ ...formData, min_increment: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DatePickerField
            label="Start Time"
            selected={formData.start_time ? new Date(formData.start_time) : null}
            onChange={(date) => setFormData({ ...formData, start_time: date ? date.toISOString() : '' })}
            placeholderText="Select start date & time"
          />
          <DatePickerField
            label="End Time"
            selected={formData.end_time ? new Date(formData.end_time) : null}
            onChange={(date) => setFormData({ ...formData, end_time: date ? date.toISOString() : '' })}
            placeholderText="Select end date & time"
            minDate={formData.start_time ? new Date(formData.start_time) : new Date()}
          />
        </div>

        {/* Image Upload */}
        <div>
          <label className="block text-sm font-medium mb-3">Images (Max 4)</label>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {previewUrls.map((url, i) => (
              <div key={i} className="relative aspect-square rounded-2xl overflow-hidden border border-slate-200">
                <img src={url} alt="preview" className="w-full h-full object-cover" />
                <button
                  type="button"
                  onClick={() => removeImage(i)}
                  className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full"
                >
                  <X size={16} />
                </button>
              </div>
            ))}

            {previewUrls.length < 4 && (
              <label className="aspect-square border-2 border-dashed border-slate-300 rounded-2xl flex flex-col items-center justify-center cursor-pointer hover:border-blue-500">
                <Image size={32} className="text-slate-400" />
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