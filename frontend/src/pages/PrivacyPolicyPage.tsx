import { Mail, ShieldCheck } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { getPageContent } from '../api/pageContentApi'
import type { PageSection } from '../api/pageContentApi'

// Header copy stays static; the body sections are loaded from the database
// (site_content, slug = "privacy") so admins can edit or add sections.

function renderBody(body: string) {
  return body
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

function SectionList({ sections }: { sections: PageSection[] }) {
  if (sections.length === 0) {
    return (
      <p className="text-sm text-slate-400">This policy has no sections yet.</p>
    )
  }
  return (
    <div className="space-y-5">
      {sections.map((section) => (
        <section
          key={section.id}
          className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6"
        >
          <h2 className="mb-3 font-bold text-slate-950">{section.title}</h2>
          <ul className="space-y-2.5">
            {renderBody(section.body).map((item, i) => (
              <li key={i} className="flex items-start gap-2 text-sm leading-6 text-slate-600">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-600" />
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

export default function PrivacyPolicyPage() {
  const year = new Date().getFullYear()
  const { data: sections = [], isLoading, isError } = useQuery({
    queryKey: ['page-content', 'privacy'],
    queryFn: () => getPageContent('privacy'),
  })

  return (
    <div className="min-h-[calc(100vh-7rem)] rounded-[2rem] bg-gradient-to-br from-sky-50 via-white to-blue-50 p-5 sm:p-8">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-accent-600 text-white shadow-soft">
            <ShieldCheck size={26} />
          </div>
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-accent-600">
            Privacy Policy
          </p>
          <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
            Your Privacy Matters
          </h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
            This policy explains how AuctionHub collects, uses, and protects your personal
            information when you use our online auction platform.
          </p>
          <p className="mt-4 text-xs text-slate-400">
            Last updated: {year} &middot; Effective as of {year}
          </p>
        </div>

        {isLoading ? (
          <p className="py-10 text-center text-sm text-slate-400">Loading…</p>
        ) : isError ? (
          <p className="rounded-[1.75rem] border border-slate-200 bg-white p-6 text-center text-sm text-red-600">
            Couldn't load the Privacy Policy. Please try again later.
          </p>
        ) : (
          <section className="space-y-5">
            <SectionList sections={sections} />

            <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
              <h2 className="mb-3 font-bold text-slate-950">Contact Us</h2>
              <p className="text-sm leading-6 text-slate-600">
                If you have any questions about this Privacy Policy or your personal data,
                please contact us at:
              </p>
              <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
                <Mail size={16} className="text-accent-600" />
                <a href="mailto:support@auctionhub.sg" className="hover:text-accent-600">
                  support@auctionhub.sg
                </a>
              </p>
            </section>
          </section>
        )}
      </div>
    </div>
  )
}
