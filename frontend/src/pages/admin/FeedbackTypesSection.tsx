import React, { useEffect, useState } from 'react'
import { Check, Pencil, Plus, ToggleLeft, ToggleRight, Trash2, X } from 'lucide-react'
import StyledSelect from '../../components/StyledSelect'
import { useOptions } from '../../hooks/useOptions'
import { createFeedbackType, deleteFeedbackType, getAllFeedbackTypes, updateFeedbackType } from '../../api/feedbackApi'
import { getErrorMessage } from './adminShared'
import type { FeedbackType } from '../../api/feedbackApi'

export default function FeedbackTypesSection() {
  const roleOptions = useOptions('feedback_role')
  const [types, setTypes] = useState<FeedbackType[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [newName, setNewName] = useState('')
  const [newRole, setNewRole] = useState<
    'buyer' | 'seller'
  >('buyer')
  const [creating, setCreating] = useState(false)

  const [editId, setEditId] = useState<
    string | null
  >(null)
  const [editName, setEditName] = useState('')

  const reload = async () => {
    try {
      const data = await getAllFeedbackTypes()
      setTypes(data)
    } catch {
      setError('Failed to load feedback types.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void reload()
  }, [])

  const handleCreate = async (
    event: React.FormEvent,
  ) => {
    event.preventDefault()

    if (!newName.trim()) {
      return
    }

    setCreating(true)
    setError('')

    try {
      await createFeedbackType({
        name: newName.trim(),
        reviewer_role: newRole,
      })

      setNewName('')
      await reload()
    } catch (error: any) {
      setError(
        getErrorMessage(
          error,
          'Failed to create feedback type.',
        ),
      )
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
      await updateFeedbackType(id, {
        name: editName.trim(),
      })

      setEditId(null)
      await reload()
    } catch (error: any) {
      setError(
        getErrorMessage(error, 'Failed to rename.'),
      )
    }
  }

  const handleToggle = async (
    feedbackType: FeedbackType,
  ) => {
    setError('')

    try {
      await updateFeedbackType(feedbackType.id, {
        is_active: !feedbackType.is_active,
      })

      await reload()
    } catch (error: any) {
      setError(
        getErrorMessage(error, 'Failed to update.'),
      )
    }
  }

  const handleDelete = async (id: string) => {
    const shouldDelete = window.confirm(
      'Delete this feedback type? This cannot be undone.',
    )

    if (!shouldDelete) {
      return
    }

    setError('')

    try {
      await deleteFeedbackType(id)
      await reload()
    } catch (error: any) {
      setError(
        getErrorMessage(
          error,
          'Failed to delete. Deactivate it instead if records reference it.',
        ),
      )
    }
  }

  if (loading) {
    return (
      <p className="text-sm text-slate-400">
        Loading…
      </p>
    )
  }

  return (
    <div className="space-y-6">
      <form
        onSubmit={handleCreate}
        className="flex flex-wrap items-end gap-3"
      >
        <div className="min-w-[180px] flex-1">
          <label className="mb-1 block text-xs font-semibold text-slate-600">
            Name
          </label>

          <input
            value={newName}
            onChange={event =>
              setNewName(event.target.value)
            }
            placeholder="e.g. Buyer to Seller"
            required
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-accent-500 focus:ring-4 focus:ring-accent-500/15"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">
            Reviewer role
          </label>

          <StyledSelect
            value={newRole}
            onChange={event =>
              setNewRole(
                event.target.value as
                  | 'buyer'
                  | 'seller',
              )
            }
          >
            {roleOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </StyledSelect>
        </div>

        <button
          type="submit"
          disabled={creating}
          className="inline-flex items-center gap-2 rounded-xl bg-accent-600 px-4 py-2 text-sm font-bold text-white hover:bg-accent-700 disabled:opacity-60"
        >
          <Plus size={15} />

          {creating ? 'Adding…' : 'Add Type'}
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
              <th className="px-4 py-3 text-left">
                Name
              </th>

              <th className="px-4 py-3 text-left">
                Reviewer Role
              </th>

              <th className="px-4 py-3 text-left">
                Status
              </th>

              <th className="px-4 py-3 text-right">
                Actions
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-slate-100">
            {types.length === 0 ? (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-8 text-center text-slate-400"
                >
                  No feedback types yet.
                </td>
              </tr>
            ) : (
              types.map(feedbackType => (
                <tr
                  key={feedbackType.id}
                  className="hover:bg-slate-50"
                >
                  <td className="px-4 py-3">
                    {editId === feedbackType.id ? (
                      <div className="flex items-center gap-2">
                        <input
                          autoFocus
                          value={editName}
                          onChange={event =>
                            setEditName(
                              event.target.value,
                            )
                          }
                          onKeyDown={event => {
                            if (event.key === 'Enter') {
                              void handleRename(
                                feedbackType.id,
                              )
                            }

                            if (event.key === 'Escape') {
                              setEditId(null)
                            }
                          }}
                          className="rounded-lg border border-slate-200 px-2 py-1 text-sm outline-none focus:border-accent-500"
                        />

                        <button
                          type="button"
                          onClick={() =>
                            void handleRename(
                              feedbackType.id,
                            )
                          }
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
                      <span className="font-medium text-slate-900">
                        {feedbackType.name}
                      </span>
                    )}
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        feedbackType.reviewer_role ===
                        'buyer'
                          ? 'bg-blue-50 text-blue-700'
                          : 'bg-purple-50 text-purple-700'
                      }`}
                    >
                      {feedbackType.reviewer_role}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                        feedbackType.is_active
                          ? 'bg-emerald-50 text-emerald-700'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {feedbackType.is_active
                        ? 'Active'
                        : 'Inactive'}
                    </span>
                  </td>

                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        title="Rename"
                        onClick={() => {
                          setEditId(feedbackType.id)
                          setEditName(feedbackType.name)
                        }}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      >
                        <Pencil size={14} />
                      </button>

                      <button
                        type="button"
                        title={
                          feedbackType.is_active
                            ? 'Deactivate'
                            : 'Activate'
                        }
                        onClick={() =>
                          void handleToggle(
                            feedbackType,
                          )
                        }
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                      >
                        {feedbackType.is_active ? (
                          <ToggleRight
                            size={16}
                            className="text-emerald-600"
                          />
                        ) : (
                          <ToggleLeft size={16} />
                        )}
                      </button>

                      <button
                        type="button"
                        title="Delete"
                        onClick={() =>
                          void handleDelete(
                            feedbackType.id,
                          )
                        }
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
