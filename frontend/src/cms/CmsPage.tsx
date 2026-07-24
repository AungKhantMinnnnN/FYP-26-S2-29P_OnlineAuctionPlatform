import { useQuery } from '@tanstack/react-query'
import { Render } from '@puckeditor/core'
import { getPublished } from '../api/cmsApi'
import { puckConfig } from './puckConfig'

type CmsPageProps = { slug: string }

export default function CmsPage({ slug }: CmsPageProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['cms', slug, 'published'],
    queryFn: () => getPublished(slug),
  })

  if (isLoading) return null

  if (isError || !data) {
    return (
      <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-8 py-24 text-center text-sm text-slate-500">
        Couldn't load this page right now. Please refresh or try again shortly.
      </div>
    )
  }

  return (
    <div className="w-full max-w-[1280px] mx-auto px-4 sm:px-8 py-12 space-y-20">
      <Render config={puckConfig} data={data.content} />
    </div>
  )
}
