import { getTranslations } from "next-intl/server"

import { buttonVariants } from "@/components/ui/button"
import { Link } from "@/i18n/navigation"
import { cn } from "@/lib/utils"

export default async function NotFound() {
  const t = await getTranslations("notFound")

  return (
    <div className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center gap-4 px-4 py-24 text-center">
      <p className="font-heading text-5xl font-semibold text-muted-foreground">
        404
      </p>
      <h1 className="font-heading text-2xl font-semibold">{t("title")}</h1>
      <p className="text-muted-foreground">{t("body")}</p>
      <Link
        href="/"
        className={cn(buttonVariants({ variant: "default" }), "mt-2 h-11 px-6")}
      >
        {t("home")}
      </Link>
    </div>
  )
}
