import { useMemo, useState } from 'react'
import { CreditCard, ShieldCheck, Wallet } from 'lucide-react'
import DataTable from '../components/DataTable'
import FormInput from '../components/FormInput'
import PrimaryButton from '../components/PrimaryButton'
import SectionHeader from '../components/SectionHeader'
import SelectField from '../components/SelectField'
import StatusBadge from '../components/StatusBadge'
import { wallet_transactions } from '../data/mockData'
import { useAuth } from '../context/AuthContext'

const quickAmounts = [10, 25, 50, 100, 250]
const methods = [{ value: 'Wireframe Card', label: 'Wireframe Card' }, { value: 'PayNow', label: 'PayNow' }, { value: 'Bank Transfer', label: 'Bank Transfer' }]

export default function WalletTopUpPage() {
  const { user, adjustBalance } = useAuth()
  const userId = user?.id ?? 1
  const balance = user?.balance ?? 0
  const [amount, setAmount] = useState('50')
  const [method, setMethod] = useState('Wireframe Card')
  const [message, setMessage] = useState('')
  const [localTransactions, setLocalTransactions] = useState([])
  const transactions = useMemo(() => [...localTransactions, ...wallet_transactions.filter((transaction) => transaction.user_id === userId)], [localTransactions, userId])

  const handleSubmit = (event) => {
    event.preventDefault()
    const value = Number(amount)
    if (value < 5 || value > 10000) return setMessage('Top up amount must be between $5 and $10,000.')
    const transaction = { id: `local-${Date.now()}`, user_id: userId, type: 'topup', amount: value, reference: method, status: 'completed', created_at: 'just now' }
    setLocalTransactions((items) => [transaction, ...items])
    adjustBalance(value)
    setMessage(`Successfully topped up $${value.toFixed(2)}.`)
  }

  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-soft dark:border-slate-800 dark:bg-slate-900/70">
        <div className="grid gap-6 p-6 lg:grid-cols-[0.9fr_1.1fr] lg:p-8">
          <div>
            <p className="mb-3 inline-flex rounded-full bg-accent-50 px-3 py-1 text-xs font-semibold text-accent-700 dark:bg-accent-950/40 dark:text-accent-300">Wallet Top Up</p>
            <h1 className="text-3xl font-bold tracking-tight text-slate-950 dark:text-slate-50">${balance.toFixed(2)}</h1>
            <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">Current balance from users.balance.</p>
          </div>
          <form onSubmit={handleSubmit} className="rounded-2xl bg-slate-50 p-5 dark:bg-slate-950/60">
            <div className="mb-4 flex items-center gap-3"><span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-accent-50 text-accent-700 dark:bg-accent-950/40 dark:text-accent-300"><CreditCard size={20} /></span><div><p className="font-semibold text-slate-950 dark:text-slate-50">Add funds</p><p className="text-xs text-slate-500 dark:text-slate-400">Mock payment only</p></div></div>
            <div className="mb-3 grid grid-cols-3 gap-2 sm:grid-cols-5">{quickAmounts.map((value) => <button key={value} type="button" onClick={() => setAmount(String(value))} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:border-accent-300 hover:text-accent-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300">${value}</button>)}</div>
            <div className="mb-3 grid gap-3 sm:grid-cols-2"><FormInput label="Custom Amount" type="number" min="5" max="10000" value={amount} onChange={(event) => setAmount(event.target.value)} /><SelectField label="Payment Method" value={method} onChange={(event) => setMethod(event.target.value)} options={methods} /></div>
            {message && <p className={`mb-3 rounded-xl px-3 py-2 text-xs font-medium ${message.startsWith('Successfully') ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300' : 'bg-red-50 text-red-700 dark:bg-red-950/30 dark:text-red-300'}`}>{message}</p>}
            <PrimaryButton fullWidth type="submit"><Wallet size={16} className="mr-2" /> Confirm Top Up</PrimaryButton>
          </form>
        </div>
      </div>
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
        <SectionHeader title="Recent Wallet Transactions" subtitle="Records use wallet_transactions fields" />
        <DataTable headers={['Type', 'Amount', 'Reference', 'Status', 'Date']} rows={transactions.map((transaction) => [<span key={`${transaction.id}-type`} className="inline-flex items-center gap-2 font-medium capitalize"><ShieldCheck size={15} className="text-accent-600 dark:text-accent-300" /> {transaction.type.replace('_', ' ')}</span>, <span key={`${transaction.id}-amount`} className={transaction.amount >= 0 ? 'font-semibold text-emerald-600 dark:text-emerald-300' : 'font-semibold text-red-600 dark:text-red-300'}>{transaction.amount >= 0 ? '+' : '-'}${Math.abs(transaction.amount).toFixed(2)}</span>, transaction.reference, <StatusBadge key={`${transaction.id}-status`} status={transaction.status} />, transaction.created_at])} />
      </div>
    </div>
  )
}
