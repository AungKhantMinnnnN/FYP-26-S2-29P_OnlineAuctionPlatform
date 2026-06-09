import { useMemo, useState } from 'react'
import { ArrowDownLeft, ArrowUpRight, CreditCard, Plus, ShieldCheck, Wallet } from 'lucide-react'
import DashboardStatCard from '../components/DashboardStatCard'
import DataTable from '../components/DataTable'
import PrimaryButton from '../components/PrimaryButton'
import SectionHeader from '../components/SectionHeader'
import StatusBadge from '../components/StatusBadge'
export interface WalletTransactionItem {
  id: string;
  user_id: string;
  transaction_type: 'top-up' | 'bid-hold' | 'refund' | 'withdrawal' | string;
  amount: number;
  status: 'pending' | 'completed' | 'failed' | string;
  method: string;
  created_at: string;
}
import { useAuth } from '../context/AuthContext'

interface WalletPageProps {
  mode?: 'top-up'
}

export default function WalletPage({ mode }: WalletPageProps) {
  const { user, adjustBalance } = useAuth()
  const [amount, setAmount] = useState(mode === 'top-up' ? '100' : '')
  const [message, setMessage] = useState('')
  const [localTransactions, setLocalTransactions] = useState<WalletTransactionItem[]>([])
  
  const userId = user?.id ?? '1'
  const balance = user?.balance ?? 0
  
  const transactions = useMemo(() => {
    return [...localTransactions]
  }, [localTransactions, userId])

  const totalTopUps = useMemo(() => {
    return transactions
      .filter((transaction) => transaction.transaction_type === 'top-up' && transaction.status === 'completed')
      .reduce((sum, transaction) => sum + transaction.amount, 0)
  }, [transactions])

  const pendingAmount = useMemo(() => {
    return transactions
      .filter((transaction) => transaction.status === 'pending')
      .reduce((sum, transaction) => sum + Math.abs(transaction.amount), 0)
  }, [transactions])

  const handleTopUp = (e: React.FormEvent) => {
    e.preventDefault()
    const value = Number(amount)
    if (!value || value <= 0) {
      setMessage('Enter a valid amount to top up.')
      return
    }

    adjustBalance(value)
    setLocalTransactions((items) => [
      {
        id: `local-${Date.now()}`,
        user_id: userId,
        transaction_type: 'top-up',
        amount: value,
        status: 'completed',
        method: 'Wireframe Card',
        created_at: 'just now',
      },
      ...items,
    ])
    setAmount('')
    setMessage(`Successfully topped up $${value.toFixed(2)}.`)
  }

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-soft dark:border-slate-800 dark:bg-slate-900/70">
        <div className="grid gap-6 p-6 lg:grid-cols-[1.2fr_0.8fr] lg:p-8">
          <div>
            <p className="mb-3 inline-flex rounded-full bg-accent-50 px-3 py-1 text-xs font-semibold text-accent-700 dark:bg-accent-950/40 dark:text-accent-300">Wallet Balance</p>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-slate-50">${balance.toFixed(2)}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-500 dark:text-slate-400">Your Balance is used when placing bids. Successful bids immediately reserve the bid amount in this wireframe.</p>
            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <PrimaryButton to="/wallet/top-up"><Plus size={16} className="mr-2" /> Top Up Balance</PrimaryButton>
            </div>
          </div>
          <form onSubmit={handleTopUp} className="rounded-2xl bg-slate-50 p-5 dark:bg-slate-950/60">
            <div className="mb-4 flex items-center gap-3">
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-accent-50 text-accent-700 dark:bg-accent-950/40 dark:text-accent-300"><CreditCard size={20} /></span>
              <div>
                <p className="font-semibold text-slate-950 dark:text-slate-50">Quick Top Up</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">Mock payment for prototype demo</p>
              </div>
            </div>
            <input type="number" min="1" step="1" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Enter amount" className="mb-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm focus:border-accent-500 focus:outline-none focus:ring-4 focus:ring-accent-500/15 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100" />
            {message && <p className="mb-3 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300">{message}</p>}
            <PrimaryButton fullWidth type="submit">Add Funds</PrimaryButton>
          </form>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <DashboardStatCard title="Available Balance" value={`$${balance.toFixed(2)}`} icon={Wallet} trend="Ready for bidding" />
        <DashboardStatCard title="Completed Top Ups" value={`$${totalTopUps.toFixed(2)}`} icon={ArrowDownLeft} trend="Wallet funding" />
        <DashboardStatCard title="Pending" value={`$${pendingAmount.toFixed(2)}`} icon={ArrowUpRight} trend="In processing" />
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
        <SectionHeader title="Wallet Transactions" subtitle="Top-ups, bid holds, refunds, and withdrawals" />
        <DataTable
          headers={['Type', 'Amount', 'Method', 'Status', 'Date']}
          rows={transactions.map((transaction) => [
            <span key={`${transaction.id}-type`} className="inline-flex items-center gap-2 font-medium capitalize"><ShieldCheck size={15} className="text-accent-600 dark:text-accent-300" /> {transaction.transaction_type.replace('-', ' ')}</span>,
            <span key={`${transaction.id}-amount`} className={transaction.amount >= 0 ? 'font-semibold text-emerald-600 dark:text-emerald-300' : 'font-semibold text-red-600 dark:text-red-300'}>{transaction.amount >= 0 ? '+' : '-'}${Math.abs(transaction.amount).toFixed(2)}</span>,
            transaction.method,
            <StatusBadge key={`${transaction.id}-status`} status={transaction.status} />,
            transaction.created_at,
          ])}
        />
      </div>
    </div>
  )
}
