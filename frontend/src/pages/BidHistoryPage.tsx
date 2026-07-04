import SectionHeader from '../components/SectionHeader'
import DataTable from '../components/DataTable'
import StatusBadge from '../components/StatusBadge'

// TODO: Replace with actual data from backend
const bidHistory: any[] = []

export default function BidHistoryPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <SectionHeader title="Bid History" subtitle="Complete log of all your bids and outcomes" />

      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <DataTable
          headers={['Item', 'Amount', 'Timestamp', 'Status', 'Result']}
          rows={bidHistory.map(b => [
            b.item,
            `$${b.amount.toFixed(2)}`,
            b.timestamp,
            <StatusBadge key={b.id} status={b.status} />,
            <span key={b.id} className={`font-semibold ${b.result === 'Won' ? 'text-accent-700' : b.result === 'Lost' || b.result === 'Outbid' ? 'text-red-600' : 'text-slate-950'}`}>{b.result}</span>
          ])}
        />
      </div>
    </div>
  )
}