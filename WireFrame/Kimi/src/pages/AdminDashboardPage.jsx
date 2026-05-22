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
        <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-slate-50">Admin Dashboard</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">Platform oversight, moderation, and analytics.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <DashboardStatCard title="Total Users" value={adminStats.totalUsers.toLocaleString()} icon={Users} trend="+12 this week" />
        <DashboardStatCard title="Active Auctions" value={adminStats.activeAuctions} icon={Gavel} trend="42 ending today" />
        <DashboardStatCard title="Pending Moderation" value={adminStats.pendingModeration} icon={AlertCircle} trend="Requires review" />
        <DashboardStatCard title="Open Cases" value={adminStats.openCases} icon={MessageSquare} trend="2 urgent" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
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

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
          <SectionHeader title="Listing Moderation" />
          <DataTable
            headers={['Title', 'Seller', 'Submitted', 'Status', 'Action']}
            rows={listingModeration.map(l => [
              l.title,
              l.seller,
              l.submitted,
              <StatusBadge key={l.id} status={l.status} />,
              <div key={l.id} className="flex gap-2">
                <button className="text-xs font-semibold text-accent-600 hover:underline dark:text-accent-300">Approve</button>
                <button className="text-xs font-semibold text-red-600 hover:underline dark:text-red-400">Remove</button>
              </div>
            ])}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
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

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
          <SectionHeader title="Category Management" />
          <div className="space-y-2 mb-4">
            {categories.map(c => (
              <div key={c} className="flex items-center justify-between rounded-xl border border-slate-200/80 bg-slate-50 px-3 py-2 text-sm dark:border-slate-800 dark:bg-slate-950/50">
                <span className="font-medium text-slate-700 dark:text-slate-300">{c}</span>
                <button className="text-xs font-semibold text-red-500 hover:underline dark:text-red-400">Delete</button>
              </div>
            ))}
          </div>
          <div className="flex gap-2">
            <input type="text" placeholder="New category" className="flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm focus:border-accent-500 focus:outline-none focus:ring-4 focus:ring-accent-500/15 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100" />
            <button className="rounded-xl bg-accent-600 px-3 py-2 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-accent-700">Add</button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
          <SectionHeader title="Audit Logs" />
          <DataTable
            headers={['Admin', 'Action', 'Time']}
            rows={auditLogs.map(l => [l.admin, l.action, l.timestamp])}
          />
        </div>
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
        <SectionHeader title="Analytics Overview" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
            <div className="flex items-center gap-2 mb-2 text-slate-500 text-sm dark:text-slate-400"><BarChart3 size={16} /> Bid Volume</div>
            <div className="h-24 flex items-end gap-1">
              {[40,60,30,80,50,90,70].map((h,i) => <div key={i} style={{height:`${h}%`}} className="flex-1 rounded-t-md bg-accent-300 dark:bg-accent-700" />)}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
            <div className="flex items-center gap-2 mb-2 text-slate-500 text-sm dark:text-slate-400"><Activity size={16} /> User Growth</div>
            <div className="h-24 flex items-end gap-1">
              {[20,35,45,40,60,75,85].map((h,i) => <div key={i} style={{height:`${h}%`}} className="flex-1 rounded-t-md bg-accent-400 dark:bg-accent-600" />)}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200/80 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-950/50">
            <div className="flex items-center gap-2 mb-2 text-slate-500 text-sm dark:text-slate-400"><Users size={16} /> Active Sessions</div>
            <div className="h-24 flex items-end gap-1">
              {[50,55,60,58,70,65,80].map((h,i) => <div key={i} style={{height:`${h}%`}} className="flex-1 rounded-t-md bg-accent-500 dark:bg-accent-500" />)}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}