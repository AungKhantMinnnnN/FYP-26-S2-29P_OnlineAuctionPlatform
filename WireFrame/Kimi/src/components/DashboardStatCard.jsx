export default function DashboardStatCard({ title, value, icon: Icon, trend }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-500">{title}</span>
        {Icon && <Icon size={20} className="text-accent-600" />}
      </div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      {trend && <div className="text-xs text-gray-500 mt-1">{trend}</div>}
    </div>
  )
}