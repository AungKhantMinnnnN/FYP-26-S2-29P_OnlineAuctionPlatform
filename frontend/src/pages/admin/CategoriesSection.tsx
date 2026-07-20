import React, { useEffect, useState } from 'react'
import { Check, Pencil, Plus, ToggleLeft, ToggleRight, Trash2, X } from 'lucide-react'
import StyledSelect from '../../components/StyledSelect'
import { createAdminCategory, deleteAdminCategory, getAdminCategories, updateAdminCategory } from '../../api/adminApi'
import { getErrorMessage, slugify } from './adminShared'
import type { AdminCategory } from '../../api/adminApi'

export default function CategoriesSection() {
  const [categories, setCategories] = useState<AdminCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [newName, setNewName] = useState('')
  const [newSlug, setNewSlug] = useState('')
  const [slugTouched, setSlugTouched] = useState(false)
  const [newParentId, setNewParentId] = useState('')
  const [creating, setCreating] = useState(false)

  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const reload = async () => {
    try {
      const data = await getAdminCategories()
      setCategories(data)
    } catch {
      setError('Failed to load categories.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void reload()
  }, [])

  const topLevelCategories = categories.filter(c => !c.parent_id)

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault()

    if (!newName.trim() || !newSlug.trim()) {
      return
    }

    setCreating(true)
    setError('')

    try {
      await createAdminCategory({
        name: newName.trim(),
        slug: newSlug.trim(),
        parent_id: newParentId || null,
      })

      setNewName('')
      setNewSlug('')
      setNewParentId('')
      setSlugTouched(false)
      await reload()
    } catch (error: any) {
      setError(getErrorMessage(error, 'Failed to create category.'))
    } finally {
      setCreating(false)
    }
  }

  const handleRename = async (id: string) => {
    if (!editName.trim()) {
      return
    }

    setError('')

    try {
      await updateAdminCategory(id, { name: editName.trim() })
      setEditId(null)
      await reload()
    } catch (error: any) {
      setError(getErrorMessage(error, 'Failed to rename.'))
    }
  }

  const handleToggle = async (category: AdminCategory) => {
    setError('')

    try {
      await updateAdminCategory(category.id, { is_active: !category.is_active })
      await reload()
    } catch (error: any) {
      setError(getErrorMessage(error, 'Failed to update.'))
    }
  }

  const handleDelete = async (id: string) => {
    const shouldDelete = window.confirm(
      'Delete this category? Categories still referenced by listings will be deactivated instead of deleted.',
    )

    if (!shouldDelete) {
      return
    }

    setError('')

    try {
      await deleteAdminCategory(id)
      await reload()
    } catch (error: any) {
      setError(getErrorMessage(error, 'Failed to delete category.'))
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-400">Loading…</p>
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3">
        <div className="min-w-[160px] flex-1">
          <label className="mb-1 block text-xs font-semibold text-slate-600">Name</label>
          <input
            value={newName}
            onChange={event => {
              const value = event.target.value
              setNewName(value)
              if (!slugTouched) {
                setNewSlug(slugify(value))
              }
            }}
            placeholder="e.g. Vintage Watches"
            required
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-accent-500 focus:ring-4 focus:ring-accent-500/15"
          />
        </div>

        <div className="min-w-[160px] flex-1">
          <label className="mb-1 block text-xs font-semibold text-slate-600">Slug</label>
          <input
            value={newSlug}
            onChange={event => {
              setSlugTouched(true)
              setNewSlug(event.target.value)
            }}
            placeholder="vintage-watches"
            required
            pattern="[a-z0-9]+(-[a-z0-9]+)*"
            title="Lowercase alphanumeric with hyphens only"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-accent-500 focus:ring-4 focus:ring-accent-500/15"
          />
        </div>

        <div className="min-w-[160px]">
          <label className="mb-1 block text-xs font-semibold text-slate-600">Parent category</label>
          <StyledSelect
            value={newParentId}
            onChange={event => setNewParentId(event.target.value)}
          >
            <option value="">None (top-level)</option>
            {topLevelCategories.map(category => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </StyledSelect>
        </div>

        <button
          type="submit"
          disabled={creating}
          className="inline-flex items-center gap-2 rounded-xl bg-accent-600 px-4 py-2 text-sm font-bold text-white hover:bg-accent-700 disabled:opacity-60"
        >
          <Plus size={15} />
          {creating ? 'Adding…' : 'Add Category'}
        </button>
      </form>

      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
          {error}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200">
       <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-4 py-3 text-left">Name</th>
              <th className="px-4 py-3 text-left">Slug</th>
              <th className="px-4 py-3 text-left">Parent</th>
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {categories.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-slate-400">
                  No categories yet.
                </td>
              </tr>
            ) : (
              categories.map(category => (
                <tr key={category.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3">
                    {editId === category.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          autoFocus
                          value={editName}
                          onChange={event => setEditName(event.target.value)}
                          onKeyDown={event => {
                            if (event.key === 'Enter') {
                              void handleRename(category.id)
                            }
                            if (event.key === 'Escape') {
                              setEditId(null)
                            }
                          }}
                          className="rounded-lg border border-slate-200 px-2 py-1 text-sm outline-none focus:border-accent-500"
                        />
                        <button
                          type="button"
                          onClick={() => void handleRename(category.id)}
                          className="text-emerald-600 hover:text-emerald-700"
                        >
                          <Check size={15} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditId(null)}
                          className="text-slate-400 hover:text-slate-600"
                        >
                          <X size={15} />
                        </button>
                      </div>
                    ) : (
                      <span className="font-medium text-slate-900">{category.name}</span>
                    )}
                  </td>

                  <td className="px-4 py-3 text-slate-500">{category.slug}</td>

                  <td className="px-4 py-3 text-slate-500">
                    {categories.find(c => c.id === category.parent_id)?.name ?? '—'}
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        category.is_active
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {category.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        title="Rename"
                        onClick={() => {
                          setEditId(category.id)
                          setEditName(category.name)
                        }}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      >
                        <Pencil size={14} />
                      </button>

                      <button
                        type="button"
                        title={category.is_active ? 'Deactivate' : 'Activate'}
                        onClick={() => void handleToggle(category)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      >
                        {category.is_active ? (
                          <ToggleRight size={16} className="text-emerald-600" />
                        ) : (
                          <ToggleLeft size={16} />
                        )}
                      </button>

                      <button
                        type="button"
                        title="Delete"
                        onClick={() => void handleDelete(category.id)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
       </div>
      </div>
    </div>
  )
}

// Shared pagination footer — hidden until there is more than one page of results.
