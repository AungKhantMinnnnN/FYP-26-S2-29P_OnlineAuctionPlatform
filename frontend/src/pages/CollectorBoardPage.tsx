import { useState, useEffect, useCallback } from 'react'
import { Crown, Globe, Lock, Plus, Trash2, X, LayoutGrid } from 'lucide-react'
import Modal from '../components/Modal'
import FormInput from '../components/FormInput'
import PrimaryButton from '../components/PrimaryButton'
import SecondaryButton from '../components/SecondaryButton'
import EmptyState from '../components/EmptyState'
import { useAuth } from '../context/AuthContext'
import {
  getMyBoards, getBoard, createBoard, updateBoard, deleteBoard, addBoardItem, removeBoardItem,
} from '../api/boardsApi'
import type { BoardSummary, BoardDetail, BoardItem } from '../api/boardsApi'
import { getMyPurchases } from '../api/usersApi'
import type { PurchaseItem } from '../api/usersApi'

export default function CollectorBoardPage() {
  const { user } = useAuth()
  const isPremium = user?.subscription_tier === 'premium'

  const [boards, setBoards] = useState<BoardSummary[]>([])
  const [activeBoard, setActiveBoard] = useState<BoardDetail | null>(null)
  const [isLoadingBoards, setIsLoadingBoards] = useState(true)
  const [isLoadingBoard, setIsLoadingBoard] = useState(false)

  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [pendingPurchases, setPendingPurchases] = useState<PurchaseItem[]>([])
  const [newBoardName, setNewBoardName] = useState('')
  const [newBoardPublic, setNewBoardPublic] = useState(false)
  const [isCreating, setIsCreating] = useState(false)

  const loadBoard = useCallback(async (id: string) => {
    setIsLoadingBoard(true)
    try {
      setActiveBoard(await getBoard(id))
    } catch (err) {
      console.error(err)
    } finally {
      setIsLoadingBoard(false)
    }
  }, [])

  useEffect(() => {
    if (!isPremium) return
    setIsLoadingBoards(true)
    getMyBoards()
      .then((data) => {
        setBoards(data)
        if (data.length > 0) loadBoard(data[0].id)
      })
      .catch(console.error)
      .finally(() => setIsLoadingBoards(false))
  }, [isPremium, loadBoard])

  const handleCreateBoard = async () => {
    if (!newBoardName.trim()) return
    setIsCreating(true)
    try {
      const board = await createBoard({ name: newBoardName.trim(), is_public: newBoardPublic })
      setBoards((prev) => [...prev, board])
      setNewBoardName('')
      setNewBoardPublic(false)
      setShowCreateModal(false)
      loadBoard(board.id)
    } catch (err) {
      console.error(err)
    } finally {
      setIsCreating(false)
    }
  }

  const handleDeleteBoard = async (id: string) => {
    try {
      await deleteBoard(id)
      const next = boards.filter((b) => b.id !== id)
      setBoards(next)
      if (activeBoard?.id === id) {
        setActiveBoard(null)
        if (next.length > 0) loadBoard(next[0].id)
      }
    } catch (err) {
      console.error(err)
    }
  }

  const openAddModal = async () => {
    try {
      const data = await getMyPurchases({ size: 100 })
      const onBoard = new Set(activeBoard?.items.map((i) => i.auction_result_id) ?? [])
      setPendingPurchases(data.items.filter((p) => !onBoard.has(p.auction_result_id)))
    } catch (err) {
      console.error(err)
    }
    setShowAddModal(true)
  }

  const handleAddItem = async (purchase: PurchaseItem) => {
    if (!activeBoard) return
    try {
      const item = await addBoardItem(activeBoard.id, purchase.auction_result_id)
      setActiveBoard((prev) => prev ? { ...prev, items: [...prev.items, item] } : prev)
      setPendingPurchases((prev) => prev.filter((p) => p.auction_result_id !== purchase.auction_result_id))
      setBoards((prev) => prev.map((b) =>
        b.id === activeBoard.id ? { ...b, item_count: b.item_count + 1 } : b
      ))
    } catch (err) {
      console.error(err)
    }
  }

  const handleToggleVisibility = async () => {
    if (!activeBoard) return
    const next = !activeBoard.is_public
    try {
      const updated = await updateBoard(activeBoard.id, { is_public: next })
      setActiveBoard((prev) => prev ? { ...prev, is_public: next } : prev)
      setBoards((prev) => prev.map((b) => b.id === activeBoard.id ? { ...b, is_public: updated.is_public } : b))
    } catch (err) {
      console.error(err)
    }
  }

  const handleRemoveItem = async (item: BoardItem) => {
    if (!activeBoard) return
    try {
      await removeBoardItem(activeBoard.id, item.id)
      setActiveBoard((prev) => prev ? { ...prev, items: prev.items.filter((i) => i.id !== item.id) } : prev)
      setBoards((prev) => prev.map((b) =>
        b.id === activeBoard.id ? { ...b, item_count: Math.max(0, b.item_count - 1) } : b
      ))
    } catch (err) {
      console.error(err)
    }
  }

  if (!isPremium) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="mx-auto max-w-sm text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-3xl bg-amber-50 text-amber-500">
            <Crown size={28} />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-950">Premium Feature</h2>
          <p className="mt-3 text-sm leading-6 text-slate-500">
            Collector Boards are exclusive to Premium members. Curate and showcase items
            you've won at auction. Upgrade to unlock this feature.
          </p>
          <div className="mt-6">
            <PrimaryButton to="/profile">Upgrade to Premium</PrimaryButton>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-slate-950">Collector Boards</h1>
            <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-bold text-amber-600 ring-1 ring-amber-200">
              <Crown size={10} /> Premium
            </span>
          </div>
          <p className="mt-1 text-sm text-slate-500">Curate and showcase items you've won at auction.</p>
        </div>
        <PrimaryButton onClick={() => setShowCreateModal(true)}>
          <Plus size={15} className="mr-1.5" /> New Board
        </PrimaryButton>
      </div>

      {isLoadingBoards ? (
        <div className="py-20 text-center text-sm text-slate-400 animate-pulse">Loading boards…</div>
      ) : boards.length === 0 ? (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-10 shadow-sm">
          <EmptyState message="You haven't created any boards yet. Start by creating your first one." />
          <div className="mt-5 flex justify-center">
            <PrimaryButton onClick={() => setShowCreateModal(true)}>
              <Plus size={15} className="mr-1.5" /> Create Your First Board
            </PrimaryButton>
          </div>
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[260px_1fr]">
          {/* Boards list */}
          <div className="space-y-2">
            <p className="px-1 text-xs font-semibold uppercase tracking-wider text-slate-400">My Boards</p>
            {boards.map((board) => (
              <button
                key={board.id}
                onClick={() => loadBoard(board.id)}
                className={`group flex w-full items-center justify-between rounded-xl px-3 py-3 text-left transition ${
                  activeBoard?.id === board.id
                    ? 'bg-accent-50 ring-1 ring-accent-200'
                    : 'border border-slate-200/80 bg-white hover:border-accent-200 hover:bg-accent-50/50'
                }`}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    {board.is_public
                      ? <Globe size={12} className="shrink-0 text-slate-400" />
                      : <Lock size={12} className="shrink-0 text-slate-400" />}
                    <span className={`truncate text-sm font-semibold ${
                      activeBoard?.id === board.id ? 'text-accent-700' : 'text-slate-800'
                    }`}>
                      {board.name}
                    </span>
                  </div>
                  <p className="mt-0.5 pl-[18px] text-xs text-slate-400">
                    {board.item_count} item{board.item_count !== 1 ? 's' : ''}
                  </p>
                </div>
                <button
                  onClick={(e) => { e.stopPropagation(); handleDeleteBoard(board.id) }}
                  className="ml-2 shrink-0 rounded-lg p-1 text-slate-400 opacity-0 transition group-hover:opacity-100 hover:bg-red-50 hover:text-red-500"
                >
                  <Trash2 size={14} />
                </button>
              </button>
            ))}
          </div>

          {/* Board contents */}
          <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
            {isLoadingBoard ? (
              <div className="py-20 text-center text-sm text-slate-400 animate-pulse">Loading board…</div>
            ) : activeBoard ? (
              <>
                <div className="mb-5 flex items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <LayoutGrid size={16} className="text-accent-600" />
                      <h2 className="font-semibold text-slate-950">{activeBoard.name}</h2>
                    </div>
                    <p className="mt-0.5 text-xs text-slate-400">
                      {activeBoard.items.length} item{activeBoard.items.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* Visibility toggle */}
                    <button
                      type="button"
                      onClick={handleToggleVisibility}
                      className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 transition hover:bg-slate-100"
                      title={activeBoard.is_public ? 'Click to set Private' : 'Click to set Public'}
                    >
                      {activeBoard.is_public
                        ? <Globe size={14} className="text-emerald-600" />
                        : <Lock size={14} className="text-slate-400" />}
                      <span className="text-xs font-semibold text-slate-700">
                        {activeBoard.is_public ? 'Public' : 'Private'}
                      </span>
                      <span className={`relative h-5 w-9 shrink-0 rounded-full transition-colors ${activeBoard.is_public ? 'bg-emerald-500' : 'bg-slate-300'}`}>
                        <span className={`absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all ${activeBoard.is_public ? 'left-4' : 'left-0.5'}`} />
                      </span>
                    </button>
                    <SecondaryButton onClick={openAddModal}>
                      <Plus size={14} className="mr-1.5" /> Add Items
                    </SecondaryButton>
                  </div>
                </div>

                {activeBoard.items.length === 0 ? (
                  <EmptyState message="This board is empty. Add items from your won auctions." />
                ) : (
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-4">
                    {activeBoard.items.map((item) => (
                      <div key={item.id} className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                        <div className="aspect-square overflow-hidden bg-slate-100">
                          {item.listing?.image_url ? (
                            <img
                              src={item.listing.image_url}
                              alt={item.listing.title}
                              className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-slate-300">
                              <LayoutGrid size={32} />
                            </div>
                          )}
                        </div>
                        <div className="p-3">
                          {item.listing ? (
                            <>
                              <p className="truncate text-xs font-semibold text-slate-800">{item.listing.title}</p>
                              <p className="mt-0.5 text-xs font-bold text-accent-700">
                                ${item.listing.final_price.toFixed(2)}
                              </p>
                            </>
                          ) : (
                            <p className="truncate text-xs font-medium text-slate-400">Listing no longer available</p>
                          )}
                        </div>
                        <button
                          onClick={() => handleRemoveItem(item)}
                          className="absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full bg-white/90 text-slate-400 opacity-0 shadow-sm transition group-hover:opacity-100 hover:bg-red-50 hover:text-red-500"
                        >
                          <X size={12} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : null}
          </div>
        </div>
      )}

      {/* Create Board Modal */}
      <Modal isOpen={showCreateModal} onClose={() => setShowCreateModal(false)} title="Create New Board">
        <div className="mt-2 space-y-4">
          <FormInput
            label="Board Name"
            placeholder="e.g. Vintage Watches"
            value={newBoardName}
            onChange={(e) => setNewBoardName(e.target.value)}
          />
          <div className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-slate-800">Make Public</p>
              <p className="text-xs text-slate-500">Anyone can view this board</p>
            </div>
            <button
              type="button"
              onClick={() => setNewBoardPublic((v) => !v)}
              className={`relative h-6 w-11 rounded-full transition-colors ${newBoardPublic ? 'bg-accent-600' : 'bg-slate-300'}`}
            >
              <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${newBoardPublic ? 'left-5' : 'left-0.5'}`} />
            </button>
          </div>
          <div className="flex gap-3 pt-1">
            <SecondaryButton onClick={() => setShowCreateModal(false)} fullWidth>Cancel</SecondaryButton>
            <PrimaryButton onClick={handleCreateBoard} disabled={isCreating || !newBoardName.trim()} fullWidth>
              {isCreating ? 'Creating…' : 'Create Board'}
            </PrimaryButton>
          </div>
        </div>
      </Modal>

      {/* Add Items Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Add Won Auctions">
        <div className="mt-2 max-h-96 space-y-2 overflow-y-auto">
          {pendingPurchases.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">
              All your won auctions are already on this board.
            </p>
          ) : (
            pendingPurchases.map((purchase) => (
              <div
                key={purchase.auction_result_id}
                className="flex items-center justify-between rounded-xl border border-slate-200 p-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-800">{purchase.listing_title}</p>
                  <p className="text-xs text-slate-400">
                    ${purchase.final_price.toFixed(2)} — {new Date(purchase.ended_at).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => handleAddItem(purchase)}
                  className="ml-3 shrink-0 rounded-full bg-accent-600 px-3 py-1.5 text-xs font-bold text-white transition hover:opacity-90"
                >
                  Add
                </button>
              </div>
            ))
          )}
        </div>
      </Modal>
    </div>
  )
}
