import type { Metadata } from "next"
import { getTranslations, setRequestLocale } from "next-intl/server"

import { CatalogView } from "@/components/catalog/catalog-view"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("catalog")
  return { title: t("title") }
}

type SearchParams = Record<string, string | string[] | undefined>

export default async function ProductsPage({
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
