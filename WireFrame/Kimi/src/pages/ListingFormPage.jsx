import { useState } from 'react'
import { Image, Save, Upload } from 'lucide-react'
import FormInput from '../components/FormInput'
import SelectField from '../components/SelectField'
import TextAreaField from '../components/TextAreaField'
import PrimaryButton from '../components/PrimaryButton'
import SecondaryButton from '../components/SecondaryButton'
import { categories, conditions, biddingTypes } from '../data/mockData'

export default function ListingFormPage() {
  const [images, setImages] = useState([null, null, null, null])

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-slate-50">Create Listing</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Fill in the details below to publish your auction.</p>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm space-y-5 dark:border-slate-800 dark:bg-slate-900/70">
        <FormInput label="Title" placeholder="e.g. Vintage Film Camera" />
        <TextAreaField label="Description" placeholder="Describe the item condition, history, and any defects..." rows={4} />

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SelectField label="Category" placeholder="Select category" options={categories} />
          <SelectField label="Condition" placeholder="Select condition" options={conditions} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FormInput label="Starting Price ($)" type="number" placeholder="0.00" />
          <FormInput label="Reserve Price ($)" type="number" placeholder="0.00" />
          <FormInput label="Minimum Increment ($)" type="number" placeholder="5.00" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <SelectField label="Auction Duration" placeholder="Select duration" options={['1 Day', '3 Days', '7 Days', '14 Days']} />
          <SelectField label="Bidding Type" placeholder="Select type" options={biddingTypes} />
        </div>

        <div>
          <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">Images</label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {images.map((_, i) => (
              <button key={i} className="aspect-square rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 flex flex-col items-center justify-center text-slate-400 transition-colors hover:border-accent-400 hover:bg-accent-50/50 hover:text-accent-600 dark:border-slate-700 dark:bg-slate-950/50 dark:hover:border-accent-700 dark:hover:bg-accent-950/30 dark:hover:text-accent-300">
                <Image size={24} />
                <span className="text-xs mt-1">Upload</span>
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
          <SecondaryButton><Save size={16} className="mr-1" /> Save Draft</SecondaryButton>
          <PrimaryButton><Upload size={16} className="mr-1" /> Publish Listing</PrimaryButton>
        </div>
      </div>
    </div>
  )
}