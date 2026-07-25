import { useEffect, useState } from 'react'
import { Check, Pencil, Plus, ToggleLeft, ToggleRight, Trash2, X } from 'lucide-react'
import Modal from '../../components/Modal'
import { createAdminCategory, deleteAdminCategory, getAdminCategories, updateAdminCategory } from '../../api/adminApi'
import { getErrorMessage, slugify } from './adminShared'
import type { AdminCategory } from '../../api/adminApi'

export default function CategoriesSection() {
  const [categories, setCategories] = useState<AdminCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [newName, setNewName] = useState('')
  const [creating, setCreating] = useState(false)

  const [editId, setEditId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const [deleteTarget, setDeleteTarget] = useState<AdminCategory | null>(null)
  const [deleting, setDeleting] = useState(false)

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

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault()

    const name = newName.trim()
    if (!name) {
      return
    }

    setCreating(true)
    setError('')

    try {
      await createAdminCategory({ name, slug: slugify(name) })
      setNewName('')
      await reload()
    } catch (error: any) {
      if (error?.response?.status === 409) {
        setError(`A category named "${name}" already exists.`)
      } else {
        setError(getErrorMessage(error, 'Failed to create category.'))
      }
    } finally {
      setCreating(false)
    }
  }

  const handleRename = async (id: string) => {
    const name = editName.trim()
    if (!name) {
      return
    }

    setError('')

    try {
      await updateAdminCategory(id, { name })
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

  const handleDelete = async () => {
    if (!deleteTarget) return

    setError('')
    setDeleting(true)

    try {
      await deleteAdminCategory(deleteTarget.id)
      setDeleteTarget(null)
      await reload()
    } catch (error: any) {
      setError(getErrorMessage(error, 'Failed to delete category.'))
    } finally {
      setDeleting(false)
    }
  }

  if (loading) {
    return <p className="text-sm text-slate-400">Loading…</p>
  }

  return (
    <div className="space-y-6">
      <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3">
        <div className="min-w-[220px] flex-1">
          <label className="mb-1 block text-xs font-semibold text-slate-600">Name</label>
          <input
            value={newName}
            onChange={event => setNewName(event.target.value)}
            placeholder="e.g. Vintage Watches"
            required
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-accent-500 focus:ring-4 focus:ring-accent-500/15"
          />
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
              <th className="px-4 py-3 text-left">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {categories.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
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
                        onClick={() => setDeleteTarget(category)}
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

      <Modal isOpen={deleteTarget !== null} onClose={() => setDeleteTarget(null)} title="Delete this category?">
        <p className="text-sm text-slate-600 mb-5">
          {deleteTarget && (
            <>Removes <span className="font-semibold text-slate-900">{deleteTarget.name}</span>. If it's still referenced by any listings or saved interests, it will be deactivated instead of deleted.</>
          )}
        </p>
        <div className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => setDeleteTarget(null)}
            className="text-sm font-medium text-slate-600 hover:text-slate-900 px-3 py-2"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => void handleDelete()}
            disabled={deleting}
            className="text-sm font-bold bg-red-600 text-white rounded-lg px-4 py-2 hover:bg-red-700 disabled:opacity-50"
          >
            {deleting ? 'Deleting…' : 'Delete'}
          </button>
        </div>
      </Modal>
    </div>
  )
}
