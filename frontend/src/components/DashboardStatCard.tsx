export default function DashboardStatCard({ title, value, icon: Icon, trend = null }: any) {
  return (
    <div className="bg-white p-6 rounded-xl border border-gray-100 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
          <Icon size={20} />
        </div>
        {trend && (
          <span className={`text-xs font-medium px-2 py-1 rounded-full ${
            trend.isUp ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-600'
          }`}>
            {trend.isUp ? '↑' : '↓'} {trend.value}
          </span>
        )}
      </div>
      <h3 className="text-sm font-medium text-gray-500">{title}</h3>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
    </div>
  )
}
