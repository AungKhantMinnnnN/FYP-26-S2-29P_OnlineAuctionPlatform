import { Inbox } from 'lucide-react'
import PrimaryButton from './PrimaryButton'
import React from 'react'

interface EmptyStateProps {
  message: string
  actionText?: string
  actionTo?: string
}

export default function EmptyState({ message, actionText, actionTo }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Inbox size={40} className="text-gray-300 mb-3" />
      <p className="text-sm text-gray-500 mb-2">{message}</p>
      {actionText && actionTo && <PrimaryButton to={actionTo}>{actionText}</PrimaryButton>}
    </div>
  )
}
