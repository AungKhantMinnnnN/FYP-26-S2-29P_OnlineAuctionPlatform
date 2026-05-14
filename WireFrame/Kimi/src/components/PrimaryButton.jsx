import { Link } from 'react-router-dom'

export default function PrimaryButton({ children, to, onClick, type = 'button', fullWidth = false, disabled = false }) {
  const className = `inline-flex items-center justify-center px-4 py-2 rounded-lg bg-accent-600 text-white text-sm font-medium hover:bg-accent-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-accent-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${fullWidth ? 'w-full' : ''}`
  if (to) return <Link to={to} className={className}>{children}</Link>
  return <button type={type} onClick={onClick} disabled={disabled} className={className}>{children}</button>
}