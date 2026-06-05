import { setRequestLocale } from "next-intl/server"

import { CatalogView } from "@/components/catalog/catalog-view"

type SearchParams = Record<string, string | string[] | undefined>

export default async function HomePage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>
  searchParams: Promise<SearchParams>
}) {
  const { locale } = await params
  setRequestLocale(locale)
  return <CatalogView searchParams={searchParams} />
}
