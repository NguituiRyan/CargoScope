import type { Metadata } from "next"
import { notFound, redirect } from "next/navigation"
import { getTranslations, setRequestLocale } from "next-intl/server"
import { Trash2 } from "lucide-react"

import { ProductForm } from "@/components/products/product-form"
import { ProductMediaManager } from "@/components/products/product-media-manager"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button"
import { localePath } from "@/lib/auth/session"
import { getMyManufacturer } from "@/lib/manufacturers/queries"
import { deleteProductAction } from "@/lib/products/actions"
import { getCategoryOptions, getMyProduct } from "@/lib/products/queries"
import { cn } from "@/lib/utils"

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("product")
  return { title: t("editTitle") }
}

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>
}) {
  const { locale, id } = await params
  setRequestLocale(locale)

  const manufacturer = await getMyManufacturer()
  if (!manufacturer) redirect(localePath(locale, "/seller/onboarding"))

  const product = await getMyProduct(manufacturer.id, id)
  if (!product) notFound()

  const t = await getTranslations("product")
  const categories = await getCategoryOptions()

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader>
          <CardTitle>{t("editTitle")}</CardTitle>
          <CardDescription>{t("editSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent>
          <ProductForm
            locale={locale}
            categories={categories}
            initial={product}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{t("media")}</CardTitle>
        </CardHeader>
        <CardContent>
          <ProductMediaManager
            locale={locale}
            productId={product.id}
            media={product.media}
            primaryImageUrl={product.primaryImageUrl}
          />
        </CardContent>
      </Card>

      <Card className="border-destructive/30">
        <CardHeader>
          <CardTitle className="text-lg">{t("dangerTitle")}</CardTitle>
          <CardDescription>{t("dangerHint")}</CardDescription>
        </CardHeader>
        <CardContent>
          <form action={deleteProductAction}>
            <input type="hidden" name="locale" value={locale} />
            <input type="hidden" name="productId" value={product.id} />
            <button
              type="submit"
              className={cn(
                buttonVariants({ variant: "destructive", size: "lg" })
              )}
            >
              <Trash2 className="size-4" aria-hidden />
              {t("deleteProduct")}
            </button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
