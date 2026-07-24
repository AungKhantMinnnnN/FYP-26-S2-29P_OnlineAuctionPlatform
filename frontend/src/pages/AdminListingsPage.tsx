import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, Check, Download, Eye, Gavel, Image, Search, ShieldAlert, Trash2, X } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import apiClient from '../api/apiClient'
import DashboardStatCard from '../components/DashboardStatCard'
import StatusBadge from '../components/StatusBadge'
import StyledSelect from '../components/StyledSelect'
import { useOptions } from '../hooks/useOptions'

type Listing = {
  id: string; title: string; seller_id: string; category_id?: string | null; condition: string
  current_price?: number | null; starting_price?: number | null; status: string; end_time?: string | null
  seller?: { username: string }; images?: { image_url?: string }[]; description?: string | null; brand?: string | null
  min_increment?: number | null; reserve_price?: number | null
  winner_username?: string | null; winning_amount?: number | null
}
type ListingsResponse = { items: Listing[]; total: number; page: number; pages: number; sell_through_pct?: number | null }
type Bid = { id: string; bidder?: { username: string }; bidder_id: string; amount: number; status: string; placed_at: string }
type Category = { id: string; name: string }

const PAGE_SIZE = 20
const money = (value?: number | null) => new Intl.NumberFormat('en-SG', { style: 'currency', currency: 'SGD' }).format(value || 0)
const dateTime = (value?: string | null) => value ? new Intl.DateTimeFormat('en-SG', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value)) : '—'
const titleCase = (value: string) => value.replaceAll('_', ' ').replace(/\b\w/g, letter => letter.toUpperCase())

export default function AdminListingsPage() {
  const routerNavigate = useNavigate()
  const statusOptions = useOptions('listing_status')
  const conditionOptions = useOptions('item_condition')
  const [listings, setListings] = useState<Listing[]>([])
  const [sellThroughPct, setSellThroughPct] = useState<number | null>(null)
  const [categories, setCategories] = useState<Category[]>([])
  const [searchInput, setSearchInput] = useState('')
  const [search, setSearch] = useState('')
  const [status, setStatus] = useState('')
  const [category, setCategory] = useState('')
  const [condition, setCondition] = useState('')
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [selected, setSelected] = useState<Listing | null>(null)
  const [detail, setDetail] = useState<Listing | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [bids, setBids] = useState<Bid[]>([])
  const [bidsLoading, setBidsLoading] = useState(false)
  const [restartEnd, setRestartEnd] = useState('')
  const [modal, setModal] = useState<'remove' | 'restart' | 'bids' | null>(null)
  const [acting, setActing] = useState(false)

  const loadListings = useCallback(async () => {
    setLoading(true); setError('')
    try {
      const response = await apiClient.get<ListingsResponse>('/admin/listings', { params: { page, size: PAGE_SIZE, search: search || undefined, status: status || undefined, category_id: category || undefined, condition: condition || undefined } })
      setListings(response.data.items); setTotal(response.data.total); setPages(response.data.pages)
      setSellThroughPct(response.data.sell_through_pct ?? null)
    } catch (err: any) {
      setListings([]); setTotal(0); setPages(0); setSellThroughPct(null)
      setError(err?.response?.data?.detail || 'Unable to load listings. Confirm that the admin listings API is running.')
    } finally { setLoading(false) }
  }, [page, search, status, category, condition])

  useEffect(() => { void loadListings() }, [loadListings])
  useEffect(() => {
    apiClient.get<Category[]>('/admin/categories').then(response => setCategories(response.data)).catch(() => setCategories([]))
  }, [])

  const visibleListings = listings
  const liveCount = listings.filter(item => item.status === 'active').length
  const reviewCount = listings.filter(item => item.status === 'pending_review').length
  const bidVolume = listings.reduce((sum, item) => sum + (item.current_price || 0), 0)

  const runAction = async (action: () => Promise<unknown>, success: string) => {
    setActing(true); setError(''); setNotice('')
    try { await action(); setModal(null); setSelected(null); setNotice(success); await loadListings() }
    catch (err: any) { setError(err?.response?.data?.detail || 'The requested listing action could not be completed.') }
    finally { setActing(false) }
  }
  const openBids = async (listing: Listing) => {
    setSelected(listing); setModal('bids'); setBids([]); setBidsLoading(true); setError('')
    try { const response = await apiClient.get<Bid[]>(`/auctions/get_auction_bids/${listing.id}/bids`); setBids(response.data) }
    catch (err: any) { setError(err?.response?.data?.detail || 'Unable to load bids for this listing.') }
    finally { setBidsLoading(false) }
  }
  const openDetail = async (listing: Listing) => {
    setDetail(listing); setDetailLoading(true); setError('')
    try { const response = await apiClient.get<Listing>(`/admin/listings/${listing.id}`); setDetail(response.data) }
    catch (err: any) { setError(err?.response?.data?.detail || 'Unable to load the auction details.') }
    finally { setDetailLoading(false) }
  }
  // Keep admin listing details inside this page; other destinations use the router normally.
  const navigate = (to: string) => {
    const auctionId = to.match(/^\/auction\/(.+)$/)?.[1]
    const listing = auctionId ? listings.find(item => item.id === auctionId) : undefined
    if (listing) { void openDetail(listing); return }
    routerNavigate(to)
  }
  const exportCsv = () => {
    const rows = [['ID', 'Title', 'Seller', 'Category', 'Current bid', 'Status', 'Ends'], ...visibleListings.map(item => [item.id, item.title, item.seller?.username || item.seller_id, categories.find(c => c.id === item.category_id)?.name || 'Uncategorised', String(item.current_price || item.starting_price || 0), item.status, item.end_time || ''])]
    const csv = rows.map(row => row.map(value => `"${String(value).replaceAll('"', '""')}"`).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    const link = document.createElement('a'); link.href = url; link.download = 'listings.csv'; link.click(); URL.revokeObjectURL(url)
  }

  if (detail) return <div className="space-y-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <button onClick={() => { setDetail(null); setError('') }} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"><ArrowLeft size={16} />Back to listings</button>
      <button onClick={() => navigate('/')} className="inline-flex items-center gap-2 text-sm font-bold text-accent-700 hover:text-accent-800"><span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-accent-600 text-white"><Gavel size={16} /></span>AuctionHub</button>
    </div>
    {detailLoading ? <div className="rounded-2xl border border-slate-200 bg-white px-5 py-16 text-center text-sm text-slate-500 shadow-sm">Loading auction details…</div> : <>
      <div><p className="text-sm font-semibold text-accent-700">Admin listing detail</p><h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-950">{detail.title}</h1><p className="mt-1 text-sm text-slate-500">Listing ID: {detail.id}</p></div>
      {error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3"><div className="space-y-6 lg:col-span-2">
        <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm"><div className="aspect-video bg-slate-100">{detail.images?.[0]?.image_url ? <img src={detail.images[0].image_url} alt={detail.title} className="h-full w-full object-cover" /> : <div className="flex h-full items-center justify-center text-slate-300"><Image size={52} /></div>}</div></div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm"><div className="mb-4 flex flex-wrap items-center gap-2"><StatusBadge status={detail.status} /><span className="text-sm text-slate-500">{titleCase(detail.condition)}</span>{detail.brand && <span className="text-sm text-slate-500">• {detail.brand}</span>}</div><h2 className="text-lg font-bold text-slate-950">Description</h2><p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-slate-700">{detail.description || 'No description was provided for this listing.'}</p></div>
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm"><div className="flex items-center justify-between gap-3"><div><h2 className="text-lg font-bold text-slate-950">Bid activity</h2><p className="mt-1 text-sm text-slate-500">Review bids or remove a fraudulent bid.</p></div><button onClick={() => void openBids(detail)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">View bids</button></div></div>
      </div><aside className="space-y-6"><div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm"><p className="text-sm text-slate-500">Current bid</p><p className="mt-1 text-3xl font-bold text-slate-950">{money(detail.current_price || detail.starting_price)}</p><dl className="mt-5 space-y-3 border-t border-slate-100 pt-4 text-sm"><div className="flex justify-between gap-3"><dt className="text-slate-500">Seller</dt><dd className="font-semibold text-slate-900">{detail.seller?.username || detail.seller_id.slice(0, 8)}</dd></div><div className="flex justify-between gap-3"><dt className="text-slate-500">Starting price</dt><dd className="font-semibold text-slate-900">{money(detail.starting_price)}</dd></div>{detail.reserve_price != null && <div className="flex justify-between gap-3"><dt className="text-slate-500">Reserve price</dt><dd className="font-semibold text-slate-900">{money(detail.reserve_price)}</dd></div>}<div className="flex justify-between gap-3"><dt className="text-slate-500">Min. increment</dt><dd className="font-semibold text-slate-900">{money(detail.min_increment)}</dd></div><div className="flex justify-between gap-3"><dt className="text-slate-500">Ends</dt><dd className="text-right font-semibold text-slate-900">{dateTime(detail.end_time)}</dd></div></dl></div>{detail.status === 'ended' && <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50 p-6 shadow-sm"><p className="text-sm font-semibold text-emerald-700">Auction Result</p>{detail.winner_username ? <><p className="mt-1 text-2xl font-bold text-emerald-900">{money(detail.winning_amount)}</p><p className="mt-1 text-sm text-emerald-700">Won by <span className="font-semibold">{detail.winner_username}</span></p></> : <p className="mt-2 text-sm text-emerald-700">No winner recorded for this auction.</p>}</div>}</aside></div>
    </>}
    {modal === 'bids' && selected && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"><div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-bold text-slate-950">Review bids</h2><p className="mt-1 text-sm text-slate-500">{selected.title}</p></div><button onClick={() => setModal(null)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={18} /></button></div><div className="mt-5 max-h-80 overflow-y-auto rounded-xl border border-slate-200">{bidsLoading ? <p className="p-5 text-sm text-slate-500">Loading bids…</p> : bids.length ? bids.map(bid => <div key={bid.id} className="flex items-center justify-between gap-3 border-b border-slate-100 p-3 last:border-0"><div><p className="text-sm font-semibold text-slate-800">{bid.bidder?.username || bid.bidder_id.slice(0, 8)} · {money(bid.amount)}</p><p className="text-xs text-slate-500">{dateTime(bid.placed_at)} · {titleCase(bid.status)}</p></div><button disabled={acting || bid.status === 'cancelled'} onClick={() => void runAction(() => apiClient.delete(`/admin/bids/${bid.id}`), 'Fraudulent bid removed.')} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-600 disabled:opacity-50">Remove bid</button></div>) : <p className="p-5 text-sm text-slate-500">No bids found.</p>}</div></div></div>}
  </div>

  return <div className="space-y-6">
    <div><h1 className="text-2xl font-bold tracking-tight text-slate-950">Listing Management</h1><p className="mt-1 text-sm text-slate-500">Manage inventory, approve listings, and monitor live bidding activities.</p></div>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <DashboardStatCard title="Live Auctions" value={loading ? '—' : liveCount} icon={Gavel} trend="On this page" />
      <DashboardStatCard title="Pending Review" value={loading ? '—' : reviewCount} icon={ShieldAlert} trend="On this page" />
      <DashboardStatCard title="Total Bid Volume" value={loading ? '—' : money(bidVolume)} icon={Gavel} trend="Current bids on this page" />
      <DashboardStatCard
        title="Avg. Sell-through"
        value={loading ? '—' : sellThroughPct === null ? '—' : `${sellThroughPct}%`}
        icon={Gavel}
        trend={sellThroughPct === null ? 'No ended listings on this page' : 'Ended listings that found a winner'}
      />
    </div>
    <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <form onSubmit={event => { event.preventDefault(); setPage(1); setSearch(searchInput.trim()) }} className="relative w-full lg:max-w-md"><Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} /><input value={searchInput} onChange={event => setSearchInput(event.target.value)} placeholder="Search listing titles" className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none focus:border-accent-500 focus:ring-4 focus:ring-accent-500/15" /></form>
        <button onClick={exportCsv} disabled={!visibleListings.length} className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"><Download size={16} />Export CSV</button>
      </div>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <label className="text-xs font-semibold text-slate-500">STATUS
          <StyledSelect value={status} onChange={event => { setStatus(event.target.value); setPage(1) }} wrapperClassName="mt-1">
            <option value="">All listings</option>
            {statusOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </StyledSelect>
        </label>
        <label className="text-xs font-semibold text-slate-500">CATEGORY
          <StyledSelect value={category} onChange={event => { setCategory(event.target.value); setPage(1) }} wrapperClassName="mt-1">
            <option value="">All categories</option>
            {categories.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}
          </StyledSelect>
        </label>
        <label className="text-xs font-semibold text-slate-500">CONDITION
          <StyledSelect value={condition} onChange={event => { setCondition(event.target.value); setPage(1) }} wrapperClassName="mt-1">
            <option value="">All conditions</option>
            {conditionOptions.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </StyledSelect>
        </label>
      </div>
    </div>
    {notice && <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</p>}{error && <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm"><div className="overflow-x-auto"><table className="min-w-full divide-y divide-slate-200"><thead className="bg-slate-50"><tr>{['Listing', 'Seller', 'Category', 'Current bid', 'Status', 'Ends', 'Actions'].map(heading => <th key={heading} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">{heading}</th>)}</tr></thead><tbody className="divide-y divide-slate-200">{loading ? <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-500">Loading listings…</td></tr> : visibleListings.length === 0 ? <tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-slate-500">No listings match the selected filters.</td></tr> : visibleListings.map(item => <tr key={item.id} className="hover:bg-slate-50"><td className="px-4 py-3"><p className="font-semibold text-slate-900">{item.title}</p><p className="mt-0.5 text-xs text-slate-400">{item.id.slice(0, 8)}</p></td><td className="px-4 py-3 text-sm text-slate-700">{item.seller?.username || item.seller_id.slice(0, 8)}</td><td className="px-4 py-3 text-sm text-slate-700">{categories.find(c => c.id === item.category_id)?.name || 'Uncategorised'}</td><td className="px-4 py-3 text-sm font-semibold text-slate-900">{money(item.current_price || item.starting_price)}</td><td className="px-4 py-3"><StatusBadge status={item.status} /></td><td className="px-4 py-3 text-sm text-slate-600">{dateTime(item.end_time)}</td><td className="px-4 py-3"><div className="flex gap-1">{item.status === 'pending_review' && <button title="Approve listing" onClick={() => void runAction(() => apiClient.patch(`/admin/listings/${item.id}/approve`), 'Listing approved.')} className="rounded-lg p-2 text-slate-500 hover:bg-emerald-50 hover:text-emerald-700"><Check size={16} /></button>}<button title="View listing" onClick={() => navigate(`/auction/${item.id}`)} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"><Eye size={16} /></button><button title="Remove fraudulent bid" onClick={() => void openBids(item)} className="rounded-lg p-2 text-slate-500 hover:bg-amber-50 hover:text-amber-700"><ShieldAlert size={16} /></button>{item.status === 'ended' && <button title="Restart auction" onClick={() => { setSelected(item); setRestartEnd(''); setModal('restart') }} className="rounded-lg p-2 text-slate-500 hover:bg-accent-50 hover:text-accent-700"><Gavel size={16} /></button>}<button title="Remove listing" onClick={() => { setSelected(item); setModal('remove') }} className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"><Trash2 size={16} /></button></div></td></tr>)}</tbody></table></div>{pages > 1 && <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3 text-sm text-slate-600"><span>{total} listings</span><div className="flex gap-2"><button disabled={page === 1} onClick={() => setPage(value => value - 1)} className="rounded-lg border px-3 py-1.5 disabled:opacity-40">Previous</button><span className="px-2 py-1.5">Page {page} of {pages}</span><button disabled={page === pages} onClick={() => setPage(value => value + 1)} className="rounded-lg border px-3 py-1.5 disabled:opacity-40">Next</button></div></div>}</div>
    {modal && selected && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm"><div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"><div className="flex items-start justify-between gap-4"><div><h2 className="text-xl font-bold text-slate-950">{modal === 'remove' ? 'Remove listing?' : modal === 'restart' ? 'Restart auction' : 'Review bids'}</h2><p className="mt-1 text-sm text-slate-500">{selected.title}</p></div><button onClick={() => setModal(null)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"><X size={18} /></button></div>{modal === 'remove' && <><p className="mt-5 text-sm text-slate-600">This removes the listing from the marketplace and releases an active highest bid when applicable.</p><div className="mt-6 flex justify-end gap-3"><button onClick={() => setModal(null)} className="rounded-xl border px-4 py-2 text-sm font-semibold">Cancel</button><button disabled={acting} onClick={() => void runAction(() => apiClient.patch(`/admin/listings/${selected.id}/remove`), 'Listing removed.')} className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{acting ? 'Removing…' : 'Remove listing'}</button></div></>}{modal === 'restart' && <><label className="mt-5 block text-sm font-semibold text-slate-700">New end time<input type="datetime-local" value={restartEnd} onChange={event => setRestartEnd(event.target.value)} className="mt-2 block w-full rounded-xl border border-slate-200 p-2.5" /></label><div className="mt-6 flex justify-end gap-3"><button onClick={() => setModal(null)} className="rounded-xl border px-4 py-2 text-sm font-semibold">Cancel</button><button disabled={acting || !restartEnd} onClick={() => void runAction(() => apiClient.post(`/admin/listings/${selected.id}/restart`, { end_time: new Date(restartEnd).toISOString() }), 'Auction restarted.')} className="rounded-xl bg-accent-600 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">Restart auction</button></div></>}{modal === 'bids' && <div className="mt-5 max-h-80 overflow-y-auto rounded-xl border border-slate-200">{bidsLoading ? <p className="p-5 text-sm text-slate-500">Loading bids…</p> : bids.length ? bids.map(bid => <div key={bid.id} className="flex items-center justify-between gap-3 border-b border-slate-100 p-3 last:border-0"><div><p className="text-sm font-semibold text-slate-800">{bid.bidder?.username || bid.bidder_id.slice(0, 8)} · {money(bid.amount)}</p><p className="text-xs text-slate-500">{dateTime(bid.placed_at)} · {titleCase(bid.status)}</p></div><button disabled={acting || bid.status === 'cancelled'} onClick={() => void runAction(() => apiClient.delete(`/admin/bids/${bid.id}`), 'Fraudulent bid removed.')} className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-bold text-red-600 disabled:opacity-50">Remove bid</button></div>) : <p className="p-5 text-sm text-slate-500">No bids found.</p>}</div>}</div></div>}
  </div>
}
