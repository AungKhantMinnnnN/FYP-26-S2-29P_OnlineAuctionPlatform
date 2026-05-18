import { Users, Gavel, AlertCircle, MessageSquare, BarChart3, Activity } from 'lucide-react'
import DashboardStatCard from '../components/DashboardStatCard'
import SectionHeader from '../components/SectionHeader'
import DataTable from '../components/DataTable'
import StatusBadge from '../components/StatusBadge'
import { adminStats, adminUsers, listingModeration, caseQueue, auditLogs, categories } from '../data/mockData'

export default function AdminDashboardPage() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-sm text-gray-500">Platform oversight, moderation, and analytics.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardStatCard title="Total Users" value={adminStats.totalUsers.toLocaleString()} icon={Users} trend="+12 this week" />
        <DashboardStatCard title="Active Auctions" value={adminStats.activeAuctions} icon={Gavel} trend="42 ending today" />
        <DashboardStatCard title="Pending Moderation" value={adminStats.pendingModeration} icon={AlertCircle} trend="Requires review" />
        <DashboardStatCard title="Open Cases" value={adminStats.openCases} icon={MessageSquare} trend="2 urgent" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <SectionHeader title="User Management" actionText="View all" actionTo="/admin-dashboard" />
          <DataTable
            headers={['Name', 'Email', 'Role', 'Status', 'Joined']}
            rows={adminUsers.map(u => [
              u.name,
              u.email,
              u.role,
              <StatusBadge key={u.id} status={u.status} />,
              u.joined
            ])}
          />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <SectionHeader title="Listing Moderation" />
          <DataTable
            headers={['Title', 'Seller', 'Submitted', 'Status', 'Action']}
            rows={listingModeration.map(l => [
              l.title,
              l.seller,
              l.submitted,
              <StatusBadge key={l.id} status={l.status} />,
              <div key={l.id} className="flex gap-2">
                <button className="text-xs text-accent-600 hover:underline">Approve</button>
                <button className="text-xs text-red-600 hover:underline">Remove</button>
              </div>
            ])}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <SectionHeader title="Case Queue" />
          <DataTable
            headers={['Case ID', 'User', 'Type', 'Subject', 'Status']}
            rows={caseQueue.map(c => [
              c.id,
              c.user,
              c.type,
              c.subject,
              <StatusBadge key={c.id} status={c.status} />
            ])}
          />
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <SectionHeader title="Category Management" />
          <div className="space-y-2 mb-4">
            {categories.map(c => (
              <div key={c} className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg text-sm">
                <span>{c}</span>
                <button className="text-xs text-red-500 hover:underline">Delete</button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input type="text" placeholder="New category" className="flex-1 px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-accent-500 focus:border-accent-500" />
            <button className="px-3 py-2 rounded-lg bg-accent-600 text-white text-sm font-medium hover:bg-accent-700">Add</button>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
          <SectionHeader title="Audit Logs" />
          <DataTable
            headers={['Admin', 'Action', 'Time']}
            rows={auditLogs.map(l => [l.admin, l.action, l.timestamp])}
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
        <SectionHeader title="Analytics Overview" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2 text-gray-500 text-sm"><BarChart3 size={16} /> Bid Volume</div>
            <div className="h-24 flex items-end gap-1">
              {[40,60,30,80,50,90,70].map((h,i) => <div key={i} style={{height:`${h}%`}} className="flex-1 bg-accent-200 rounded-sm" />)}
            </div>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2 text-gray-500 text-sm"><Activity size={16} /> User Growth</div>
            <div className="h-24 flex items-end gap-1">
              {[20,35,45,40,60,75,85].map((h,i) => <div key={i} style={{height:`${h}%`}} className="flex-1 bg-accent-300 rounded-sm" />)}
            </div>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 mb-2 text-gray-500 text-sm"><Users size={16} /> Active Sessions</div>
            <div className="h-24 flex items-end gap-1">
              {[50,55,60,58,70,65,80].map((h,i) => <div key={i} style={{height:`${h}%`}} className="flex-1 bg-accent-400 rounded-sm" />)}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}