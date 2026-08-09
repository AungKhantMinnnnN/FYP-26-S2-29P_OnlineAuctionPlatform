import React, { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, ChevronDown, ChevronUp, Pencil, Plus, Save, Trash2, X } from 'lucide-react'
import {
  createPageSection,
  deletePageSection,
  listPageSections,
  reorderPageSections,
  updatePageSection,
} from '../../api/pageContentApi'
import type { PageKey, PageSection } from '../../api/pageContentApi'
import { getErrorMessage } from './adminShared'
import Modal from '../../components/Modal'
import IconTooltip from '../../components/IconTooltip'

interface PolicyContentSectionProps {
  page: PageKey
}

export default function PolicyContentSection({ page }: PolicyContentSectionProps) {
  const queryClient = useQueryClient()
  const { data: sections = [] } = useQuery({
    queryKey: ['page-content', page, 'admin'],
    queryFn: () => listPageSections(page),
  })

  const [error, setError] = useState('')

  // New-section modal state
  const [showAdd, setShowAdd] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newBullets, setNewBullets] = useState<string[]>([''])
  const [newActive, setNewActive] = useState(true)

  // Inline edit state
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [editBullets, setEditBullets] = useState<string[]>([])

  const refresh = () => queryClient.invalidateQueries({ queryKey: ['page-content', page] })

  const splitBullets = (body: string): string[] =>
    body.split('\n').map((l) => l.trim()).filter(Boolean)

  const joinBullets = (bullets: string[]): string => bullets.join('\n')

  const createMutation = useMutation({
    mutationFn: () =>
      createPageSection({ page, title: newTitle, body: joinBullets(newBullets), is_active: newActive }),
    onSuccess: () => {
      setError('')
      setShowAdd(false)
      setNewTitle('')
      setNewBullets([''])
      setNewActive(true)
      void refresh()
    },
    onError: (err: any) => setError(getErrorMessage(err, 'Failed to add the section.')),
  })

  const openAddModal = () => {
    setNewTitle('')
    setNewBullets([''])
    setNewActive(true)
    setError('')
    setShowAdd(true)
  }

  const closeAddModal = () => {
    setShowAdd(false)
    setNewTitle('')
    setNewBullets([''])
    setNewActive(true)
    setError('')
  }

  const startEdit = (s: PageSection) => {
    setEditingId(s.id)
    setEditTitle(s.title)
    setEditBullets(splitBullets(s.body))
    setError('')
  }

  const saveEdit = useMutation({
    mutationFn: (s: PageSection) =>
      updatePageSection(page, s.id, {
        title: editTitle,
        body: joinBullets(editBullets),
        is_active: s.is_active,
      }),
    onSuccess: () => {
      setError('')
      setEditingId(null)
      void refresh()
    },
    onError: (err: any) => setError(getErrorMessage(err, 'Failed to save the section.')),
  })

  const toggleActive = useMutation({
    mutationFn: (s: PageSection) =>
      updatePageSection(page, s.id, { is_active: !s.is_active }),
    onSuccess: () => void refresh(),
    onError: (err: any) => setError(getErrorMessage(err, 'Failed to update the section.')),
  })

  const deleteMutation = useMutation({
    mutationFn: (s: PageSection) => deletePageSection(page, s.id),
    onSuccess: () => void refresh(),
    onError: (err: any) => setError(getErrorMessage(err, 'Failed to delete the section.')),
  })

  const moveMutation = useMutation({
    mutationFn: (ordered: string[]) => reorderPageSections(page, ordered),
    onSuccess: () => void refresh(),
    onError: (err: any) => setError(getErrorMessage(err, 'Failed to reorder sections.')),
  })

  const move = (index: number, direction: -1 | 1) => {
    const next = [...sections]
    const target = index + direction
    if (target < 0 || target >= next.length) return
    ;[next[index], next[target]] = [next[target], next[index]]
    moveMutation.mutate(next.map((s) => s.id))
  }

  const inputClass =
    'w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm outline-none focus:border-accent-500 focus:ring-4 focus:ring-accent-500/15'

  return (
    <div className="space-y-4">
      {error && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
          {error}
        </div>
      )}

      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-slate-950">
              {page === 'privacy' ? 'Privacy Policy' : 'Terms of Service'} Sections
            </h3>
            <p className="text-sm text-slate-500">
              Edit or add body sections. Each bullet should be on its own line.
            </p>
          </div>
          <button
            type="button"
            onClick={openAddModal}
            className="inline-flex items-center gap-1.5 rounded-lg bg-accent-600 px-3.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-accent-700"
          >
            <Plus size={14} />
            Add section
          </button>
        </div>

        {sections.length === 0 ? (
          <p className="py-6 text-center text-sm text-slate-400">No sections yet.</p>
        ) : (
          <div className="space-y-3">
            {sections.map((section, index) =>
              editingId === section.id ? (
                <div key={section.id} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="mb-2.5">
                    <label className="mb-1 block text-xs font-bold text-slate-500">Title</label>
                    <input
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      className={inputClass}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="mb-1 block text-xs font-bold text-slate-500">Bullets</label>
                    <div className="space-y-2">
                      {editBullets.map((bullet, bi) => (
                        <div key={bi} className="flex items-center gap-2">
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent-600" />
                          <input
                            value={bullet}
                            onChange={(e) => {
                              const next = [...editBullets]
                              next[bi] = e.target.value
                              setEditBullets(next)
                            }}
                            className={inputClass}
                          />
                          <IconTooltip label="Remove bullet">
                            <button
                              type="button"
                              aria-label="Remove bullet"
                              onClick={() => setEditBullets(editBullets.filter((_, i) => i !== bi))}
                              className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 size={15} />
                            </button>
                          </IconTooltip>
                        </div>
                      ))}
                      <IconTooltip label="Add bullet">
                        <button
                          type="button"
                          aria-label="Add bullet"
                          onClick={() => setEditBullets([...editBullets, ''])}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:border-accent-300 hover:text-accent-600"
                        >
                          <Plus size={13} /> Add bullet
                        </button>
                      </IconTooltip>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => saveEdit.mutate(section)}
                      disabled={saveEdit.isPending || !editTitle.trim() || editBullets.length === 0}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-accent-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-accent-700 disabled:opacity-50"
                    >
                      <Save size={13} /> Save
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditingId(null)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
                    >
                      <X size={13} /> Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div key={section.id} className="rounded-xl border border-slate-200 bg-white p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-slate-900">{section.title}</h4>
                        {!section.is_active && (
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-500">
                            Hidden
                          </span>
                        )}
                      </div>
                      <ul className="mt-2 space-y-1.5">
                        {splitBullets(section.body).map((bullet, bi) => (
                          <li key={bi} className="flex items-start gap-2 text-sm leading-5 text-slate-600">
                            <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-600" />
                            <span className="min-w-0">{bullet}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    <div className="flex shrink-0 items-center gap-1">
                      <IconTooltip label="Move up">
                        <button
                          type="button"
                          aria-label="Move up"
                          onClick={() => move(index, -1)}
                          disabled={index === 0}
                          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
                        >
                          <ChevronUp size={15} />
                        </button>
                      </IconTooltip>
                      <IconTooltip label="Move down">
                        <button
                          type="button"
                          aria-label="Move down"
                          onClick={() => move(index, 1)}
                          disabled={index === sections.length - 1}
                          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-30"
                        >
                          <ChevronDown size={15} />
                        </button>
                      </IconTooltip>
                      <IconTooltip label={section.is_active ? 'Hide section' : 'Show section'}>
                        <button
                          type="button"
                          aria-label={section.is_active ? 'Hide section' : 'Show section'}
                          onClick={() => toggleActive.mutate(section)}
                          className={`rounded-lg p-1.5 transition ${
                            section.is_active
                              ? 'text-emerald-600 hover:bg-emerald-50'
                              : 'text-slate-400 hover:bg-slate-100'
                          }`}
                        >
                          <Check size={15} />
                        </button>
                      </IconTooltip>
                      <IconTooltip label="Edit">
                        <button
                          type="button"
                          aria-label="Edit"
                          onClick={() => startEdit(section)}
                          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                        >
                          <Pencil size={15} />
                        </button>
                      </IconTooltip>
                      <IconTooltip label="Delete section">
                        <button
                          type="button"
                          aria-label="Delete section"
                          onClick={() => {
                            if (window.confirm(`Delete the section "${section.title}"?`)) {
                              deleteMutation.mutate(section)
                            }
                          }}
                          className="rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 size={15} />
                        </button>
                      </IconTooltip>
                    </div>
                  </div>
                </div>
              ),
            )}
          </div>
        )}

        <Modal isOpen={showAdd} onClose={closeAddModal} title="Add Section">
          <div className="space-y-4">
            {error && (
              <div className="rounded-xl bg-red-50 px-4 py-3 text-sm font-semibold text-red-600">
                {error}
              </div>
            )}

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500">Title</label>
              <input
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className={inputClass}
                placeholder="e.g. Information We Collect"
                autoFocus
              />
            </div>

            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500">Bullets</label>
              <div className="space-y-2">
                {newBullets.map((bullet, bi) => (
                  <div key={bi} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-accent-600" />
                    <input
                      value={bullet}
                      onChange={(e) => {
                        const next = [...newBullets]
                        next[bi] = e.target.value
                        setNewBullets(next)
                      }}
                      className={inputClass}
                      placeholder={`Bullet ${bi + 1}`}
                    />
                    <IconTooltip label="Remove bullet">
                      <button
                        type="button"
                        aria-label="Remove bullet"
                        onClick={() => setNewBullets(newBullets.filter((_, i) => i !== bi))}
                        className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 size={15} />
                      </button>
                    </IconTooltip>
                  </div>
                ))}
                <IconTooltip label="Add bullet">
                  <button
                    type="button"
                    aria-label="Add bullet"
                    onClick={() => setNewBullets([...newBullets, ''])}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-slate-300 px-3 py-1.5 text-xs font-semibold text-slate-500 transition hover:border-accent-300 hover:text-accent-600"
                  >
                    <Plus size={13} /> Add bullet
                  </button>
                </IconTooltip>
              </div>
            </div>

            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={newActive}
                onChange={(e) => setNewActive(e.target.checked)}
                className="accent-accent-600"
              />
              Visible on the public page
            </label>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={closeAddModal}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => createMutation.mutate()}
                disabled={createMutation.isPending || !newTitle.trim() || newBullets.every((b) => !b.trim())}
                className="inline-flex items-center gap-1.5 rounded-lg bg-accent-600 px-3 py-1.5 text-xs font-bold text-white transition hover:bg-accent-700 disabled:opacity-50"
              >
                <Plus size={13} />
                {createMutation.isPending ? 'Adding…' : 'Add section'}
              </button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  )
}
