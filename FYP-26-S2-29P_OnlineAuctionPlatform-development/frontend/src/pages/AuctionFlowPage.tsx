import { useState } from 'react'
import { Clock, Users, Trophy, ArrowRight } from 'lucide-react'
import SectionHeader from '../components/SectionHeader'
import PrimaryButton from '../components/PrimaryButton'

export default function AuctionFlowPage() {
  const [step, setStep] = useState(1)

  const flowSteps = [
    { id: 1, title: "Browse & Discover", desc: "Explore thousands of unique items" },
    { id: 2, title: "Place Your Bid", desc: "Real-time bidding with live updates" },
    { id: 3, title: "Win & Pay", desc: "Secure checkout & instant ownership transfer" }
  ]

  return (
    <div className="space-y-10">
      <SectionHeader 
        title="How Auctions Work" 
        subtitle="Simple, transparent, and exciting — from discovery to delivery" 
      />

      <div className="flex justify-center gap-4">
        {flowSteps.map((s, idx) => (
          <button
            key={s.id}
            onClick={() => setStep(s.id)}
            className={`flex h-12 w-12 items-center justify-center rounded-full border-2 text-lg font-semibold transition-all ${
              step === s.id 
                ? 'border-accent-600 bg-accent-50 text-accent-600 dark:bg-accent-950 dark:text-accent-300' 
                : 'border-slate-200 text-slate-400 dark:border-slate-700'
            }`}
          >
            {idx + 1}
          </button>
        ))}
      </div>

      <div className="grid gap-8 lg:grid-cols-3">
        {flowSteps.map((s) => (
          <div key={s.id} className={`rounded-3xl border p-8 transition-all ${step === s.id ? 'border-accent-500 shadow-soft' : 'border-slate-200 dark:border-slate-700'}`}>
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-accent-50 text-accent-600 dark:bg-accent-950 dark:text-accent-300">
              {s.id === 1 && <Users size={32} />}
              {s.id === 2 && <Clock size={32} />}
              {s.id === 3 && <Trophy size={32} />}
            </div>
            <h3 className="mb-3 text-2xl font-semibold">{s.title}</h3>
            <p className="text-slate-600 dark:text-slate-400">{s.desc}</p>
          </div>
        ))}
      </div>

      <div className="flex justify-center">
        <PrimaryButton to="/browse">
          Start Exploring Auctions <ArrowRight className="ml-2" />
        </PrimaryButton>
      </div>
    </div>
  )
}