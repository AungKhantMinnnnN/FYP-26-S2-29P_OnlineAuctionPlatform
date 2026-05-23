import { Link } from 'react-router-dom'

export default function SecondaryButton({ children, to, onClick, type = 'button', fullWidth = false }) {
  const className = `inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:-translate-y-0.5 hover:bg-slate-50 hover:text-slate-950 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:ring-offset-2 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:bg-slate-900 dark:hover:text-slate-50 dark:focus:ring-offset-slate-950 ${fullWidth ? 'w-full' : ''}`
  if (to) return <Link to={to} className={className}>{children}</Link>
  return <button type={type} onClick={onClick} className={className}>{children}</button>
}