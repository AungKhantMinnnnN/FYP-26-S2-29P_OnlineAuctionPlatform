import { useEffect, useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, ChevronLeft, ChevronRight, CreditCard, Plus, ShieldCheck, Wallet } from 'lucide-react'
import DashboardStatCard from '../components/DashboardStatCard'
import DataTable from '../components/DataTable'
import PrimaryButton from '../components/PrimaryButton'
import SectionHeader from '../components/SectionHeader'
import { getMyWallet, topUpWallet, type WalletTransactionItem } from '../api/usersApi'
import { useAuth } from '../context/AuthContext'

interface WalletPageProps {
  mode?: 'top-up'
}

const TYPE_LABEL: Record<string, string> = {
  topup: 'Top Up',
  bid_hold: 'Bid Hold',
  bid_release: 'Bid Release',
  settlement: 'Settlement',
}

export default function WalletPage({ mode }: WalletPageProps) {
  const { refreshUser } = useAuth()
  const [balance, setBalance] = useState(0)
  const [totalTopUps, setTotalTopUps] = useState(0)
  const [pendingHolds, setPendingHolds] = useState(0)
  const [transactions, setTransactions] = useState<WalletTransactionItem[]>([])
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)
  const [amount, setAmount] = useState(mode === 'top-up' ? '100' : '')
  const [message, setMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const fetchWallet = async (targetPage: number) => {
    setLoading(true)
    try {
      const data = await getMyWallet({ page: targetPage })
      setBalance(data.balance)
      setTotalTopUps(data.total_top_ups)
      setPendingHolds(data.pending_holds)
      setTransactions(data.transactions.items)
      setTotalPages(data.transactions.pages || 1)
      setLoadError(false)
    } catch {
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchWallet(page) }, [page])

  const handleTopUp = async (e: React.FormEvent) => {
    e.preventDefault()
    const value = Number(amount)
    if (!value || value <= 0) {
      setMessage('Enter a valid amount to top up.')
      return
    }
    setSubmitting(true)
    setMessage('')
    try {
      await topUpWallet(value)
      setAmount('')
      setMessage(`Successfully topped up $${value.toFixed(2)}.`)
      // Refetch page 1 rather than patching local state -- a top-up changes balance and
      // total_top_ups together, and prepending locally would show the new row on whatever
      // page the user happens to be viewing instead of only the most recent page.
      if (page === 1) {
        await fetchWallet(1)
      } else {
        setPage(1)
      }
      await refreshUser()
    } catch {
      setMessage('Top up failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6">
      {loadError && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          Couldn't load your wallet. The balance and transactions below may be out of date — please refresh.
        </div>
      )}
      <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-soft">
        <div className="grid gap-6 p-6 lg:grid-cols-[1.2fr_0.8fr] lg:p-8">
          <div>
            <p className="mb-3 inline-flex rounded-full bg-accent-50 px-3 py-1 text-xs font-semibold text-accent-700">Wallet Balance</p>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950">${balance.toFixed(2)}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500">Your balance is used when placing bids. Successful bids immediately reserve the bid amount until the auction ends.</p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <PrimaryButton to="/wallet/top-up"><Plus size={16} className="mr-2" /> Top Up Balance</PrimaryButton>
            </div>
          </div>
          <form onSubmit={handleTopUp} className="rounded-2xl bg-slate-50 p-5">
            <div className="mb-4 flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-accent-50 text-accent-700"><CreditCard size={20} /></span>
              <div>
                <p className="font-semibold text-slate-950">Quick Top Up</p>
                <p className="text-xs text-slate-500">Simulated payment for prototype demo</p>
              </div>
            </div>
            <input
              type="number" min="1" step="1" value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              className="mb-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm focus:border-accent-500 focus:outline-none focus:ring-4 focus:ring-accent-500/15"
            />
            {message && (
              <p className={`mb-3 rounded-xl px-3 py-2 text-xs font-medium ${message.includes('failed') ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-700'}`}>
                {message}
              </p>
            )}
            <PrimaryButton fullWidth type="submit" disabled={submitting}>
              {submitting ? 'Processing…' : 'Add Funds'}
            </PrimaryButton>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <DashboardStatCard title="Available Balance" value={loading ? '…' : `$${balance.toFixed(2)}`} icon={Wallet} trend="Ready for bidding" />
        <DashboardStatCard title="Total Topped Up" value={loading ? '…' : `$${totalTopUps.toFixed(2)}`} icon={ArrowDownLeft} trend="Wallet funding" />
        <DashboardStatCard title="Active Bid Holds" value={loading ? '…' : `$${pendingHolds.toFixed(2)}`} icon={ArrowUpRight} trend="Reserved for bids" />
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <SectionHeader title="Wallet Transactions" subtitle="Top-ups, bid holds, releases, and settlements" />
        <DataTable
          headers={['Type', 'Amount', 'Reference', 'Date']}
          rows={transactions.map((t) => [
            <span key={`${t.id}-type`} className="inline-flex items-center gap-2 font-medium capitalize">
              <ShieldCheck size={15} className="text-accent-600" /> {TYPE_LABEL[t.type] ?? t.type}
            </span>,
            <span key={`${t.id}-amount`} className={t.amount >= 0 ? 'font-semibold text-emerald-600' : 'font-semibold text-red-600'}>
              {t.amount >= 0 ? '+' : ''}${Math.abs(t.amount).toFixed(2)}
            </span>,
            t.reference ?? '—',
            new Date(t.created_at).toLocaleDateString(),
          ])}
        />
        {!loading && transactions.length === 0 && (
          <p className="py-8 text-center text-sm text-slate-400">No transactions yet. Top up your wallet to get started.</p>
        )}
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="p-2 rounded-lg border border-slate-200 bg-white text-slate-700 disabled:opacity-50"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="text-sm font-medium text-slate-700">Page {page} of {totalPages}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="p-2 rounded-lg border border-slate-200 bg-white text-slate-700 disabled:opacity-50"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
