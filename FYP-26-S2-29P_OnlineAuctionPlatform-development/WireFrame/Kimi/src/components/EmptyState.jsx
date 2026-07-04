import { Inbox } from 'lucide-react'
import PrimaryButton from './PrimaryButton'

export default function EmptyState({ message, actionText, actionTo }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-white/70 py-12 text-center shadow-sm dark:border-slate-700 dark:bg-slate-900/50">
      <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
        <Inbox size={34} />
      </div>
      <p className="text-sm text-slate-500 mb-3 dark:text-slate-400">{message}</p>
      {actionText && actionTo && <PrimaryButton to={actionTo}>{actionText}</PrimaryButton>}
    </div>
  )
}