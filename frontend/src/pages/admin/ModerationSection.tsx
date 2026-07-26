import React, { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus, X } from 'lucide-react'
import DataTable from '../../components/DataTable'
import StyledSelect from '../../components/StyledSelect'
import { useOptions } from '../../hooks/useOptions'
import { createProhibitedKeyword, deleteProhibitedKeyword, getFlaggedAttempts, getProhibitedKeywords } from '../../api/adminApi'
import { Pagination, formatDate, getErrorMessage } from './adminShared'
import type { ProhibitedKeyword } from '../../api/adminApi'

function ProhibitedKeywordsPanel() {
  const categoryOptions = useOptions('keyword_category')
  const [keywords, setKeywords] = useState<ProhibitedKeyword[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [newKeyword, setNewKeyword] = useState('')
  // Category value comes from the DB-backed keyword_category option set; default to the first.
  const [newCategory, setNewCategory] = useState('')
  const effectiveCategory = newCategory || categoryOptions[0]?.value || ''
  const [adding, setAdding] = useState(false)

  const reload = async () => {
    try {
      const data = await getProhibitedKeywords()
      setKeywords(data)
    } catch {
      setError('Failed to load prohibited keywords.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void reload()
  }, [])

  const handleAdd = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!newKeyword.trim()) return

    setAdding(true)
    setError('')
    try {
      await createProhibitedKeyword(newKeyword.trim(), effectiveCategory)
      setNewKeyword('')
      await reload()
    } catch (error: any) {
      setError(getErrorMessage(error, 'Failed to add keyword.'))
    } finally {
      setAdding(false)
    }
  }

  const handleDelete = async (id: string) => {
    const shouldDelete = window.confirm('Remove this keyword from the prohibited list?')
    if (!shouldDelete) return

    setError('')
    try {
      await deleteProhibitedKeyword(id)
      await reload()
    } catch (error: any) {
      setError(getErrorMessage(error, 'Failed to remove keyword.'))
    }
  }

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <h3 className="font-bold text-slate-950">Prohibited Keywords</h3>
      <p className="mb-4 text-sm text-slate-500">
        Listings (including drafts) can't be saved if their title, description, or brand contains
        any of these words — matching is case-insensitive.
      </p>

      <form onSubmit={handleAdd} className="mb-4 flex flex-wrap items-end gap-3">
        <div className="min-w-[200px] flex-1">
          <label className="mb-1 block text-xs font-semibold text-slate-600">Keyword</label>
          <input
            value={newKeyword}
            onChange={event => setNewKeyword(event.target.value)}
            placeholder="e.g. heroin"
            required
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-accent-500 focus:ring-4 focus:ring-accent-500/15"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">Category</label>
          <StyledSelect
            value={effectiveCategory}
            onChange={event => setNewCategory(event.target.value)}
          >
            {categoryOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </StyledSelect>
        </div>
        <button
          type="submit"
          disabled={adding}
          className="inline-flex items-center gap-2 rounded-xl bg-accent-600 px-4 py-2 text-sm font-bold text-white hover:bg-accent-700 disabled:opacity-60"
        >
          <Plus size={15} />
          {adding ? 'Adding…' : 'Add Keyword'}
        </button>
      </form>

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
          {error}
        </div>
      )}

      {loading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : keywords.length === 0 ? (
        <p className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-6 text-center text-sm text-slate-400">
          No prohibited keywords yet.
        </p>
      ) : (
        <div className="flex flex-wrap gap-2">
          {keywords.map(kw => {
            const isProfanity = kw.category === 'profanity'
            return (
              <span
                key={kw.id}
                className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-medium ring-1 ${
                  isProfanity
                    ? 'bg-amber-50 text-amber-700 ring-amber-100'
                    : 'bg-red-50 text-red-700 ring-red-100'
                }`}
              >
                {kw.keyword}
                <span className="text-[10px] font-bold uppercase opacity-60">
                  {categoryOptions.find(o => o.value === kw.category)?.label ?? kw.category}
                </span>
                <button
                  type="button"
                  onClick={() => void handleDelete(kw.id)}
                  className={isProfanity ? 'text-amber-400 hover:text-amber-600' : 'text-red-400 hover:text-red-600'}
                  title="Remove keyword"
                >
                  <X size={13} />
                </button>
              </span>
            )
          })}
        </div>
      )}
    </div>
  )
}

function FlaggedAttemptsPanel() {
  const [page, setPage] = useState(1)
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin', 'flagged-attempts', page],
    queryFn: () => getFlaggedAttempts({ page, size: 20 }),
  })

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5">
      <h3 className="font-bold text-slate-950">Flagged Attempts</h3>
      <p className="mb-4 text-sm text-slate-500">
        Users who tried to save a listing containing a prohibited keyword, and what triggered it.
      </p>

      {isLoading ? (
        <p className="text-sm text-slate-400">Loading…</p>
      ) : isError ? (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
          Couldn't load flagged attempts. Please try again.
        </div>
      ) : (
        <>
          <DataTable
            headers={['Timestamp', 'User', 'Field', 'Keyword', 'Attempted Text']}
            rows={(data?.items ?? []).map(attempt => [
              formatDate(attempt.created_at),
              attempt.username ?? '—',
              <span key={attempt.id} className="capitalize">{attempt.field}</span>,
              <span key={attempt.id} className="font-semibold text-red-700">{attempt.keyword_matched}</span>,
              <span key={attempt.id} className="line-clamp-2 max-w-xs text-slate-500">{attempt.attempted_text}</span>,
            ])}
            emptyMessage="No flagged attempts yet."
          />
          <Pagination page={data?.page ?? 1} pages={data?.pages ?? 1} onPage={setPage} />
        </>
      )}
    </div>
  )
}

export default function ModerationSection() {
  return (
    <>
      <ProhibitedKeywordsPanel />
      <FlaggedAttemptsPanel />
    </>
  )
}
