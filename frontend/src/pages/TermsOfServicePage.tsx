import { FileText, Mail, Loader2 } from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { getPageContent } from '../api/pageContentApi'
import type { PageContact, PageContent, PageHeader, PageSection } from '../api/pageContentApi'

// Everything on this page — header, contact, and body sections — is loaded from
// the database (site_content, slug = "terms") so admins can edit all of it.

function renderBody(body: string) {
  return body
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
}

function SectionList({ sections }: { sections: PageSection[] }) {
  if (sections.length === 0) {
    return <p className="text-sm text-slate-400">No sections have been added yet.</p>
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

function ContactBlock({ contact }: { contact: PageContact }) {
  if (!contact.title && !contact.text && !contact.email) return null
  return (
    <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
      {contact.title && <h2 className="mb-3 font-bold text-slate-950">{contact.title}</h2>}
      {contact.text && <p className="text-sm leading-6 text-slate-600">{contact.text}</p>}
      {contact.email && (
        <p className="mt-3 flex items-center gap-2 text-sm font-semibold text-slate-800">
          <Mail size={16} className="text-accent-600" />
          <a href={`mailto:${contact.email}`} className="hover:text-accent-600">
            {contact.email}
          </a>
        </p>
      )}
    </section>
  )
}

export default function TermsOfServicePage() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['page-content', 'terms'],
    queryFn: () => getPageContent('terms'),
  })

  if (isLoading) {
    return (
      <div className="flex min-h-[calc(100vh-7rem)] items-center justify-center">
        <Loader2 className="animate-spin text-accent-600" size={28} />
      </div>
    )
  }

  if (isError || !data) {
    return (
      <div className="flex min-h-[calc(100vh-7rem)] items-center justify-center text-sm text-slate-500">
        Couldn't load the Terms of Service. Please try again later.
      </div>
    )
  }

  return <TermsPageContent content={data} />
}

function TermsPageContent({ content }: { content: PageContent }) {
  const { header, contact, sections } = content
  return (
    <div className="min-h-[calc(100vh-7rem)] rounded-[2rem] bg-gradient-to-br from-sky-50 via-white to-blue-50 p-5 sm:p-8">
      <div className="mx-auto max-w-3xl">
        <Header header={header} />
        <section className="space-y-5">
          <SectionList sections={sections} />
          <ContactBlock contact={contact} />
        </section>
      </div>
    </div>
  )
}

function Header({ header }: { header: PageHeader }) {
  return (
    <div className="mb-8 text-center">
      <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-3xl bg-accent-600 text-white shadow-soft">
        <FileText size={26} />
      </div>
      {header.kicker && (
        <p className="text-sm font-bold uppercase tracking-[0.25em] text-accent-600">
          {header.kicker}
        </p>
      )}
      {header.title && (
        <h1 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-950 sm:text-4xl">
          {header.title}
        </h1>
      )}
      {header.subtitle && (
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">
          {header.subtitle}
        </p>
      )}
      {header.last_updated_label && (
        <p className="mt-4 text-xs text-slate-400">
          {header.last_updated_label}: {new Date().toLocaleDateString()}
        </p>
      )}
    </div>
  )
}
