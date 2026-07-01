import React, { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { Camera, CheckCircle, MapPin } from 'lucide-react'
import FormInput from '../components/FormInput'
import PrimaryButton from '../components/PrimaryButton'

export default function CompleteProfilePage() {
  const navigate = useNavigate()
  const location = useLocation()

  // Values passed from RegisterPage
  const { fullName = '', email = '' } = location.state || {}

  const [name, setName] = useState(fullName)
  const [userLocation, setUserLocation] = useState('')
  const [avatar, setAvatar] = useState(null)
  const [preview, setPreview] = useState(null)

  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  const handleAvatarChange = (e) => {
    const file = e.target.files[0]

    if (!file) return

    setAvatar(file)
    setPreview(URL.createObjectURL(file))
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    setError(null)

    if (!name.trim() || !userLocation.trim()) {
      setError('Please complete all required fields.')
      return
    }

    setLoading(true)

    try {
      // Later replace with API
      // await completeProfile(name, userLocation, avatar)

      setTimeout(() => {
        navigate('/choose-interests')
      }, 800)

    } catch (err) {
      setError('Unable to save profile.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">

      {/* Email Verification Banner */}

      <div className="mb-8 rounded-2xl bg-gradient-to-r from-indigo-700 to-indigo-500 p-6 text-white shadow-lg">

        <div className="flex gap-4">

          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-white/40">

            <CheckCircle size={26} />

          </div>

          <div>

            <h2 className="text-xl font-semibold">
              Please verify your email
            </h2>

            <p className="mt-1 text-sm text-indigo-100">
              We've sent a verification link to
            </p>

            <p className="font-semibold">
              {email || 'your email'}
            </p>

            <button
              className="mt-3 text-sm underline hover:text-indigo-100"
            >
              Resend verification email
            </button>

          </div>

        </div>

      </div>

      {/* Card */}

      <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-soft">

        {/* Stepper */}

        <div className="mb-10 flex items-center justify-center">

          <div className="flex items-center">

            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-600 font-bold text-white">
              1
            </div>

            <div className="mx-5 h-1 w-32 bg-slate-200" />

            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 font-bold text-slate-500">
              2
            </div>

          </div>

        </div>

        <h1 className="text-3xl font-bold">
          Build your profile
        </h1>

        <p className="mt-2 mb-8 text-slate-500">
          Tell us who you are to personalize your auction experience.
        </p>

        {error && (
          <div className="mb-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">

          {/* Avatar */}

          <div className="flex flex-col items-center">

            <label className="relative cursor-pointer">

              <div className="flex h-28 w-28 items-center justify-center overflow-hidden rounded-full border-2 border-dashed border-slate-300 bg-slate-100">

                {preview ? (
                  <img
                    src={preview}
                    alt=""
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Camera
                    size={36}
                    className="text-slate-400"
                  />
                )}

              </div>

              <div className="absolute bottom-1 right-1 rounded-full bg-indigo-600 p-2 text-white shadow-lg">

                <Camera size={16} />

              </div>

              <input
                type="file"
                accept="image/*"
                hidden
                onChange={handleAvatarChange}
              />

            </label>

            <span className="mt-3 text-sm text-slate-500">
              Upload Avatar
            </span>

          </div>

          <FormInput
            label="Full Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Alex Tan"
          />

          <FormInput
            label="Location"
            value={userLocation}
            onChange={(e) => setUserLocation(e.target.value)}
            placeholder="e.g. Singapore"
            icon={MapPin}
          />

          <PrimaryButton
            fullWidth
            type="submit"
            disabled={loading}
          >
            {loading
              ? 'Saving Profile...'
              : 'Next: Choose Interests →'}
          </PrimaryButton>

        </form>

      </div>

    </div>
  )
}