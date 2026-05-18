import { useState } from 'react'
import { Search } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export default function SearchBar({ className = '' }) {
  const [query, setQuery] = useState('')
  const navigate = useNavigate()

  const handleSubmit = (e) => {
    e.preventDefault()
    if (query.trim()) navigate(`/browse?q=${encodeURIComponent(query)}`)
  }

  return (
    <form onSubmit={handleSubmit} className={`relative ${className}`}>
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search auctions..."
        className="w-full pl-10 pr-4 py-2 rounded-lg border border-gray-300 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-accent-500"
      />
      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
    </form>
  )
}