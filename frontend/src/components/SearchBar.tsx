import React, { useState } from 'react'
import { Search } from 'lucide-react'
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom'

interface SearchBarProps {
  className?: string
}

export default function SearchBar({ className = '' }: SearchBarProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  
  const isBrowse = location.pathname === '/browse'
  const urlQuery = searchParams.get('q') || ''
  const [localQuery, setLocalQuery] = useState('')

  const query = isBrowse ? urlQuery : localQuery

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    
    if (isBrowse) {
      if (val.trim()) {
        navigate(`/browse?q=${encodeURIComponent(val)}`, { replace: true })
      } else {
        navigate(`/browse`, { replace: true })
      }
    } else {
      setLocalQuery(val)
    }
  }

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!isBrowse) {
      if (query.trim()) {
        navigate(`/browse?q=${encodeURIComponent(query)}`)
      }
    }
  }

  return (
    <form onSubmit={handleSubmit} className={`relative ${className}`}>
      <input
        type="text"
        value={query}
        onChange={handleChange}
        placeholder="Search auctions..."
        className="w-full rounded-full border border-slate-200 bg-white/90 py-2.5 pl-10 pr-4 text-sm text-slate-900 shadow-sm transition-all placeholder:text-slate-400 focus:border-accent-500 focus:outline-none focus:ring-4 focus:ring-accent-500/15 dark:border-slate-800 dark:bg-slate-900/80 dark:text-slate-100 dark:placeholder:text-slate-500"
      />
      <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
    </form>
  )
}