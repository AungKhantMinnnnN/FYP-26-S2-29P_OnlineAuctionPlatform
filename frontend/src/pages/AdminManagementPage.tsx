import React from 'react'
import { useParams } from 'react-router-dom'
import DataTable from '../components/DataTable'
import SectionHeader from '../components/SectionHeader'
import StatusBadge from '../components/StatusBadge'
import AdminListingsPage from './AdminListingsPage'

import UsersSection from './admin/UsersSection'
import FeedbackTypesSection from './admin/FeedbackTypesSection'
import CategoriesSection from './admin/CategoriesSection'
import ActivityStatsSection from './admin/ActivityStatsSection'
import ServiceHealthPanel from './admin/ServiceHealthPanel'
import SystemLogsSection from './admin/SystemLogsSection'
import AuditLogsSection from './admin/AuditLogsSection'
import CasesSection from './admin/CasesSection'
import TestimonialsSection from './admin/TestimonialsSection'
import ModerationSection from './admin/ModerationSection'
import MarketingSection from './admin/MarketingSection'

// TODO: Replace with backend data once a bid-oversight list endpoint exists.
const bids: any[] = []

const titleMap: Record<string, string> = {
  users: 'User Management',
  'feedback-types': 'Feedback Types',
  bids: 'Bid Oversight',
}

export default function AdminManagementPage() {
  const { section = 'users' } = useParams<{
    section?: string
  }>()

  if (section === 'users') {
    return <UsersSection />
  }

  if (section === 'feedback-types') {
    return (
      <div className="space-y-6">
        <SectionHeader
          title="Feedback Types"
          subtitle="Create and manage the feedback types users can submit for auctions."
        />

        <FeedbackTypesSection />
      </div>
    )
  }

  if (section === 'activity-stats') {
    return (
      <div className="space-y-6">
        <SectionHeader
          title="Platform Activity Stats"
          subtitle="Live platform-wide activity and volume metrics."
        />
        <ActivityStatsSection />
      </div>
    )
  }

  if (section === 'system-logs') {
    return (
      <div className="space-y-6">
        <SectionHeader
          title="System Logs"
          subtitle="Application and service logs across the platform."
        />
        <ServiceHealthPanel />
        <SystemLogsSection />
      </div>
    )
  }

  if (section === 'audit-logs') {
    return (
      <div className="space-y-6">
        <SectionHeader
          title="Audit Logs"
          subtitle="Record of administrative actions taken on the platform."
        />
        <AuditLogsSection />
      </div>
    )
  }

  if (section === 'listings') {
    return <AdminListingsPage />
  }

  if (section === 'moderation') {
    return (
      <div className="space-y-6">
        <SectionHeader
          title="Moderation"
          subtitle="Manage prohibited listing content and review blocked attempts."
        />
        <ModerationSection />
      </div>
    )
  }

  if (section === 'categories') {
    return (
      <div className="space-y-6">
        <SectionHeader
          title="Category Management"
          subtitle="Create and manage the categories listings can be filed under."
        />
        <CategoriesSection />
      </div>
    )
  }

  if (section === 'cases') {
    return (
      <div className="space-y-6">
        <SectionHeader
          title="Case Queue"
          subtitle="Review and respond to support tickets submitted by users."
        />
        <CasesSection />
      </div>
    )
  }

  if (section === 'testimonials') {
    return (
      <div className="space-y-6">
        <SectionHeader
          title="Testimonials"
          subtitle="Approve user-submitted stories for public display."
        />
        <TestimonialsSection />
      </div>
    )
  }

  if (section === 'marketing') {
    return (
      <div className="space-y-6">
        <SectionHeader
          title="Marketing"
          subtitle="Manage the hero video shown on the public landing page."
        />
        <MarketingSection />
      </div>
    )
  }

  const configs: Record<
    string,
    {
      headers: string[]
      rows: React.ReactNode[][]
    }
  > = {
    bids: {
      headers: [
        'Bid ID',
        'Listing',
        'Bidder',
        'Amount',
        'Status',
      ],

      rows: bids.map(bid => [
        bid.bid_id,
        bid.listing_title,
        bid.bidder_id,
        `$${bid.bid_amount.toFixed(2)}`,
        <StatusBadge
          key={bid.bid_id}
          status={bid.status}
        />,
      ]),
    },
  }

  const config = configs[section] || configs.bids

  return (
    <div className="space-y-6">
      <SectionHeader
        title={
          titleMap[section] || 'Admin Management'
        }
        subtitle="Administrative management table ready for backend integration."
      />

      <DataTable
        headers={config.headers}
        rows={config.rows}
      />
    </div>
  )
}
