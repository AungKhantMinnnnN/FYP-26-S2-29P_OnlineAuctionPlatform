import { useParams } from 'react-router-dom'
import DataTable from '../components/DataTable'
import SectionHeader from '../components/SectionHeader'
import StatusBadge from '../components/StatusBadge'
import { auctions, categories, users, bids, adminCases, auditLogs } from '../data/mockData'

const titleMap = { users: 'User Management', listings: 'Listing Moderation', categories: 'Category Management', cases: 'Case Queue', 'audit-logs': 'Audit Logs', bids: 'Bid Oversight' }

export default function AdminManagementPage() {
  const { section = 'users' } = useParams()
  const configs = {
    users: { headers: ['User ID', 'Name', 'Email', 'Role', 'Status'], rows: users.map(u => [u.id, u.username, u.email, u.role, <StatusBadge key={u.id} status={u.status} />]) },
    listings: { headers: ['Listing ID', 'Title', 'Seller', 'Current Bid', 'Status'], rows: auctions.map(a => [a.id, a.title, a.seller.name, `$${a.currentBid.toFixed(2)}`, <StatusBadge status={a.status} />]) },
    categories: { headers: ['Category ID', 'Name', 'Active Listings'], rows: categories.map(c => [c.id, c.name, auctions.filter(a => a.category === c.name).length]) },
    cases: { headers: ['Case ID', 'Type', 'Subject', 'Status', 'Created'], rows: adminCases.map(c => [c.case_id, c.case_type, c.subject, <StatusBadge status={c.status} />, c.created_at]) },
    'audit-logs': { headers: ['Log ID', 'Admin', 'Action', 'Timestamp'], rows: auditLogs.map(l => [l.id, l.admin, l.action, l.timestamp]) },
    bids: { headers: ['Bid ID', 'Listing', 'Bidder', 'Amount', 'Status'], rows: bids.map(b => [b.id, b.listing_id, b.bidder_id, `$${b.amount.toFixed(2)}`, <StatusBadge key={b.id} status={b.status} />]) },
  }
  const config = configs[section] || configs.users
  return <div className="space-y-6"><SectionHeader title={titleMap[section] || 'Admin Management'} subtitle="Mock API-ready table shaped around users, listings, bids, categories, cases, and audit logs." /><DataTable headers={config.headers} rows={config.rows} /></div>
}