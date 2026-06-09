import React from 'react'
import { useParams } from 'react-router-dom'
import DataTable from '../components/DataTable'
import SectionHeader from '../components/SectionHeader'
import StatusBadge from '../components/StatusBadge'

// TODO: Replace with actual data from backend
const auctions: any[] = []
const categories: any[] = []
const users: any[] = []
const bids: any[] = []
const adminCases: any[] = []
const auditLogs: any[] = []

const titleMap: Record<string, string> = {
  users: 'User Management',
  listings: 'Listing Moderation',
  categories: 'Category Management',
  cases: 'Case Queue',
  'audit-logs': 'Audit Logs',
  bids: 'Bid Oversight',
}

export default function AdminManagementPage() {
  const { section = 'users' } = useParams<{ section?: string }>()

  const configs: Record<string, { headers: string[]; rows: React.ReactNode[][] }> = {
    users: {
      headers: ['User ID', 'Name', 'Email', 'Role', 'Status'],
      rows: users.map((u) => [u.user_id, u.full_name, u.email, u.role, <StatusBadge key={u.user_id} status={u.status} />]),
    },
    listings: {
      headers: ['Listing ID', 'Title', 'Seller', 'Current Bid', 'Status'],
      rows: auctions.map((a) => [a.id, a.title, a.seller.name, `$${a.currentBid.toFixed(2)}`, <StatusBadge key={a.id} status={a.status} />]),
    },
    categories: {
      headers: ['Category ID', 'Name', 'Active Listings'],
      rows: categories.map((c, i) => [i + 1, c, auctions.filter((a) => a.category === c).length]),
    },
    cases: {
      headers: ['Case ID', 'Type', 'Subject', 'Status', 'Created'],
      rows: adminCases.map((c) => [c.case_id, c.case_type, c.subject, <StatusBadge key={c.case_id} status={c.status} />, c.created_at]),
    },
    'audit-logs': {
      headers: ['Log ID', 'Admin', 'Action', 'Timestamp'],
      rows: auditLogs.map((l) => [l.id, l.admin, l.action, l.timestamp]),
    },
    bids: {
      headers: ['Bid ID', 'Listing', 'Bidder', 'Amount', 'Status'],
      rows: bids.map((b) => [b.bid_id, b.listing_title, b.bidder_id, `$${b.bid_amount.toFixed(2)}`, <StatusBadge key={b.bid_id} status={b.status} />]),
    },
  }

  const config = configs[section] || configs.users

  return (
    <div className="space-y-6">
      <SectionHeader
        title={titleMap[section] || 'Admin Management'}
        subtitle="Mock API-ready table shaped around users, listings, bids, categories, cases, and audit logs."
      />
      <DataTable headers={config.headers} rows={config.rows} />
    </div>
  )
}
