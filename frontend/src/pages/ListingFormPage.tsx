import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ImagePlus, Package, Settings2, X } from 'lucide-react'
import FormInput from '../components/FormInput'
import SelectField from '../components/SelectField'
import TextAreaField from '../components/TextAreaField'
import PrimaryButton from '../components/PrimaryButton'
import SecondaryButton from '../components/SecondaryButton'
import { createListing, updateListing, getAuction, uploadAuctionImages, getFormMetadata } from '../api/auctionsApi'
import type { Category, DurationOption, EnumType, ListingImage } from '../api/auctionsApi'

const BIDDING_TYPE_LABELS: Record<string, { label: string; hint: string }> = {
  price_up:   { label: 'Standard',   hint: 'Bids go up from starting price' },
  low_start:  { label: 'Low Start',  hint: 'Starts low, price rises with bids' },
  public:     { label: 'Open Bids',  hint: 'All bid amounts are visible to everyone' },
}

const ALLOWED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/webp']

export default function ListingFormPage() {
  const navigate = useNavigate()
  const { id } = useParams<{ id: string }>()
  const isEditMode = !!id
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [categories, setCategories] = useState<Category[]>([])
  const [conditions, setConditions] = useState<EnumType[]>([])
  const [durations, setDurations] = useState<DurationOption[]>([])
  const [biddingTypes, setBiddingTypes] = useState<EnumType[]>([])
  const [form, setForm] = useState({
    title: '',
    category_id: '',
    condition: '',
    brand: '',
    description: '',
    starting_price: '',
    reserve_price: '',
    min_increment: '1.00',
    bidding_type: 'price_up',
    duration: '7',
  })
  const [images, setImages] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [existingImages, setExistingImages] = useState<ListingImage[]>([])
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingListing, setIsLoadingListing] = useState(isEditMode)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [submitError, setSubmitError] = useState<string | null>(null)

  useEffect(() => {
    getFormMetadata()
      .then(data => {
        setCategories(data.categories.filter(c => c.is_active))
        setConditions(data.conditions)
        setDurations(data.durations)
        setBiddingTypes(data.biddingTypes)
        if (data.durations.length > 0)
          setForm(f => ({ ...f, duration: String(data.durations[1]?.value ?? data.durations[0].value) }))
      })
      .catch(console.error)
  }, [])

  useEffect(() => {
    if (!id) return
    getAuction(id)
      .then(listing => {
        setForm(f => ({
          ...f,
          title: listing.title || '',
          category_id: listing.category_id || '',
          condition: listing.condition || '',
          brand: listing.brand || '',
          description: listing.description || '',
          starting_price: listing.starting_price != null ? String(listing.starting_price) : '',
          reserve_price: listing.reserve_price != null ? String(listing.reserve_price) : '',
          min_increment: listing.min_increment != null ? String(listing.min_increment) : '1.00',
          bidding_type: listing.bidding_type || 'price_up',
        }))
        setExistingImages(listing.images || [])
      })
      .catch(err => {
        console.error('Failed to load listing', err)
        setLoadError(err.response?.data?.detail || 'Could not load this listing.')
      })
      .finally(() => setIsLoadingListing(false))
  }, [id])

  const set =
    (key: string) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
      setForm(f => ({ ...f, [key]: e.target.value }))

  const totalImages = existingImages.length + images.length

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    const valid = files.filter(f => ALLOWED_IMAGE_TYPES.includes(f.type))
    const rejected = files.length - valid.length

    if (rejected > 0) {
      setErrors(prev => ({ ...prev, images: 'Only PNG, JPG, and WEBP images are supported.' }))
    } else {
      setErrors(prev => {
        if (!prev.images) return prev
        const rest = { ...prev }
        delete rest.images
        return rest
      })
    }

    const toAdd = valid.slice(0, 4 - totalImages)
    setImages(prev => [...prev, ...toAdd])
    setPreviews(prev => [...prev, ...toAdd.map(f => URL.createObjectURL(f))])
    e.target.value = ''
  }

  const removeImage = (idx: number) => {
    URL.revokeObjectURL(previews[idx])
    setImages(prev => prev.filter((_, i) => i !== idx))
    setPreviews(prev => prev.filter((_, i) => i !== idx))
  }

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.title.trim()) e.title = 'Title is required'
    if (!form.condition) e.condition = 'Condition is required'
    if (!form.starting_price || parseFloat(form.starting_price) <= 0)
      e.starting_price = 'Starting price must be greater than 0'
    if (form.reserve_price && parseFloat(form.reserve_price) < parseFloat(form.starting_price))
      e.reserve_price = 'Reserve price must be at least the starting price'
    if (!form.min_increment || parseFloat(form.min_increment) <= 0)
      e.min_increment = 'Minimum increment must be greater than 0'
    if (images.some(f => !ALLOWED_IMAGE_TYPES.includes(f.type)))
      e.images = 'Only PNG, JPG, and WEBP images are supported.'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const submit = async (status: 'draft' | 'active') => {
    if (!validate()) return
    setSubmitError(null)
    setIsSubmitting(true)
    try {
      const now = new Date()
      const endTime = new Date(
        now.getTime() + parseInt(form.duration) * 24 * 60 * 60 * 1000,
      )
      const payload = {
        title: form.title.trim(),
        description: form.description.trim() || null,
        condition: form.condition,
        brand: form.brand.trim() || null,
        bidding_type: form.bidding_type,
        starting_price: parseFloat(form.starting_price),
        reserve_price: form.reserve_price ? parseFloat(form.reserve_price) : null,
        min_increment: parseFloat(form.min_increment),
        category_id: form.category_id || null,
        start_time: now.toISOString(),
        end_time: endTime.toISOString(),
        status,
      }

      let listingId = id
      if (isEditMode && id) {
        await updateListing(id, payload)
      } else {
        const listing = await createListing(payload)
        listingId = listing.id
      }

      if (images.length > 0 && listingId) {
        await uploadAuctionImages(listingId, images)
      }
      navigate('/activity')
    } catch (err) {
      console.error('Failed to save listing', err)
      setSubmitError(err.response?.data?.detail || 'Failed to save listing. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (isLoadingListing) {
    return (
      <div className="mx-auto max-w-3xl py-16 text-center text-sm text-slate-500">
        Loading listing details...
      </div>
    )
  }

  if (loadError) {
    return (
      <div className="mx-auto max-w-3xl py-16 text-center text-sm text-red-600">
        {loadError}
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-950">
          {isEditMode ? 'Edit Draft Listing' : 'Create New Listing'}
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          {isEditMode
            ? 'Update the details below and save your changes.'
            : 'Fill in the details below to list your item for auction.'}
        </p>
      </div>

      {/* Item Details */}
      <div className="space-y-5 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-accent-50 text-accent-700">
            <Package size={18} />
          </span>
          <div>
            <h2 className="font-semibold text-slate-950">Item Details</h2>
            <p className="text-xs text-slate-500">Describe what you're selling</p>
          </div>
        </div>

        <FormInput
          label="Listing Title"
          placeholder="e.g. Vintage Rolex Submariner 1965"
          value={form.title}
          onChange={set('title')}
          error={errors.title}
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <SelectField
            label="Category"
            value={form.category_id}
            onChange={set('category_id') as React.ChangeEventHandler<HTMLSelectElement>}
            placeholder="Select a category"
            options={categories.map(c => ({ value: c.id, label: c.name }))}
          />
          <div>
            <SelectField
              label="Item Condition"
              value={form.condition}
              onChange={set('condition') as React.ChangeEventHandler<HTMLSelectElement>}
              placeholder="Select condition"
              options={conditions.map(c => ({ value: c.id, label: c.name }))}
            />
            {errors.condition && (
              <p className="mt-1.5 text-xs font-medium text-red-600">{errors.condition}</p>
            )}
          </div>
        </div>

        <FormInput
          label="Brand"
          placeholder="e.g. Apple, Rolex, Sony — leave blank if none"
          value={form.brand}
          onChange={set('brand')}
        />

        <TextAreaField
          label="Description"
          placeholder="Describe your item's history, features, and unique qualities..."
          value={form.description}
          onChange={set('description')}
          rows={4}
        />

        {/* Media upload */}
        <div>
          <label className="mb-1.5 block text-sm font-medium text-slate-700">
            Photos{' '}
            <span className="font-normal text-slate-400">({totalImages} / 4)</span>
          </label>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            multiple
            className="hidden"
            onChange={handleFileChange}
            disabled={totalImages >= 4}
          />

          {totalImages < 4 && (
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex w-full flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50 py-8 transition hover:border-accent-300 hover:bg-accent-50"
            >
              <ImagePlus size={22} className="text-slate-400" />
              <span className="text-sm font-medium text-slate-600">Click to upload images</span>
              <span className="text-xs text-slate-400">PNG, JPG, WEBP — up to 4 photos</span>
            </button>
          )}

          {errors.images && (
            <p className="mt-1.5 text-xs font-medium text-red-600">{errors.images}</p>
          )}

          {(existingImages.length > 0 || previews.length > 0) && (
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {existingImages.map((img, i) => (
                <div
                  key={img.id}
                  className="group relative aspect-square overflow-hidden rounded-xl border border-slate-200"
                >
                  <img src={img.image_url} alt={`Uploaded ${i + 1}`} className="h-full w-full object-cover" />
                  {img.is_primary && (
                    <span className="absolute bottom-1.5 left-1.5 rounded-full bg-accent-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      Cover
                    </span>
                  )}
                </div>
              ))}
              {previews.map((src, i) => (
                <div
                  key={i}
                  className="group relative aspect-square overflow-hidden rounded-xl border border-slate-200"
                >
                  <img src={src} alt={`Preview ${i + 1}`} className="h-full w-full object-cover" />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-slate-600 opacity-0 shadow-sm transition group-hover:opacity-100 hover:bg-red-50 hover:text-red-600"
                  >
                    <X size={12} />
                  </button>
                  {existingImages.length === 0 && i === 0 && (
                    <span className="absolute bottom-1.5 left-1.5 rounded-full bg-accent-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      Cover
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Auction Settings */}
      <div className="space-y-5 rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2.5">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-accent-50 text-accent-700">
            <Settings2 size={18} />
          </span>
          <div>
            <h2 className="font-semibold text-slate-950">Auction Settings</h2>
            <p className="text-xs text-slate-500">Set your pricing and timing</p>
          </div>
        </div>

        {/* Bidding type */}
        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">Auction Type</label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {(biddingTypes.length > 0 ? biddingTypes : [
              { id: 'price_up', name: 'price_up' },
              { id: 'low_start', name: 'low_start' },
              { id: 'public', name: 'public' },
            ]).map(({ id }) => {
              const meta = BIDDING_TYPE_LABELS[id] ?? { label: id, hint: '' }
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setForm(f => ({ ...f, bidding_type: id }))}
                  className={`rounded-xl border px-4 py-3 text-left transition ${
                    form.bidding_type === id
                      ? 'border-accent-500 bg-accent-50 ring-2 ring-accent-500/20'
                      : 'border-slate-200 hover:border-accent-300'
                  }`}
                >
                  <p className={`text-sm font-semibold ${form.bidding_type === id ? 'text-accent-700' : 'text-slate-700'}`}>
                    {meta.label}
                  </p>
                  <p className="mt-0.5 text-xs text-slate-500">{meta.hint}</p>
                </button>
              )
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FormInput
            label="Starting Price ($)"
            type="number"
            placeholder="0.00"
            min="0"
            step="0.01"
            value={form.starting_price}
            onChange={set('starting_price')}
            error={errors.starting_price}
          />
          <FormInput
            label="Reserve Price ($)"
            type="number"
            placeholder="No reserve"
            min="0"
            step="0.01"
            value={form.reserve_price}
            onChange={set('reserve_price')}
            error={errors.reserve_price}
          />
          <FormInput
            label="Min. Bid Increment ($)"
            type="number"
            placeholder="1.00"
            min="0.01"
            step="0.01"
            value={form.min_increment}
            onChange={set('min_increment')}
            error={errors.min_increment}
          />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700">
            Auction Duration
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {durations.map(({ value, label }) => (
              <button
                key={value}
                type="button"
                onClick={() => setForm(f => ({ ...f, duration: String(value) }))}
                className={`rounded-xl border py-3 text-sm font-semibold transition ${
                  form.duration === String(value)
                    ? 'border-accent-500 bg-accent-50 text-accent-700 ring-2 ring-accent-500/20'
                    : 'border-slate-200 text-slate-600 hover:border-accent-300 hover:text-accent-700'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {submitError && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {submitError}
        </div>
      )}

      {/* Actions */}
      <div className="flex flex-col-reverse gap-3 pb-6 sm:flex-row sm:justify-end">
        <SecondaryButton onClick={() => submit('draft')} disabled={isSubmitting}>
          {isSubmitting ? 'Saving…' : isEditMode ? 'Save Changes' : 'Save as Draft'}
        </SecondaryButton>
        <PrimaryButton onClick={() => submit('active')} disabled={isSubmitting}>
          {isSubmitting ? 'Publishing…' : 'Publish Auction'}
        </PrimaryButton>
      </div>
    </div>
  )
}
