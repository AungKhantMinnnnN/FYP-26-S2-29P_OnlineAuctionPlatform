import { useParams } from 'react-router-dom'
import SectionHeader from '../components/SectionHeader'
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

  return (
    <div className="space-y-6">
      <SectionHeader
        title="Not found"
        subtitle={`There's no admin section called "${section}".`}
      />
    </div>
  )
}
