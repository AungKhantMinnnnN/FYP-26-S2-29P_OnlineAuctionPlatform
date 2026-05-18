import SectionHeader from '../components/SectionHeader'
import DataTable from '../components/DataTable'
import StatusBadge from '../components/StatusBadge'
import { bidHistory } from '../data/mockData'

export default function BidHistoryPage() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <SectionHeader title="Bid History" subtitle="Complete log of all your bids and outcomes" />

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <DataTable
          headers={['Item', 'Amount', 'Timestamp', 'Status', 'Result']}
          rows={bidHistory.map(b => [
            b.item,
            `$${b.amount.toFixed(2)}`,
            b.timestamp,
            <StatusBadge key={b.id} status={b.status} />,
            <span key={b.id} className={`font-medium ${b.result === 'Won' ? 'text-accent-700' : b.result === 'Lost' || b.result === 'Outbid' ? 'text-red-600' : 'text-gray-900'}`}>{b.result}</span>
          ])}
        />
      </div>
    </div>
  )
}