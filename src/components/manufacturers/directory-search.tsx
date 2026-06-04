"use client"

import { useSearchParams } from "next/navigation"
import { useTranslations } from "next-intl"
import { Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useRouter } from "@/i18n/navigation"

export function DirectorySearch() {
  const t = useTranslations("directory")
  const router = useRouter()
  const params = useSearchParams()

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const formData = new FormData(event.currentTarget)
    const q = String(formData.get("q") ?? "").trim()
    router.push({ pathname: "/manufacturers", query: q ? { q } : {} })
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-2">
      <Input
        name="q"
        type="search"
        defaultValue={params.get("q") ?? ""}
        placeholder={t("searchPlaceholder")}
        className="max-w-md"
      />
      <Button type="submit" size="lg">
        <Search className="size-4" aria-hidden />
        {t("search")}
      </Button>
    </form>
  )
}
