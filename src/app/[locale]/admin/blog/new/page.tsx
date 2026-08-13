import { setRequestLocale } from "next-intl/server"
import { BlogEditor } from "@/components/blog/blog-editor"

export default async function NewBlogPostPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  return <div className="flex flex-col gap-5"><div><p className="text-sm font-bold text-primary uppercase">Blog CMS</p><h1 className="font-heading text-3xl font-bold">New article</h1></div><BlogEditor locale={locale} /></div>
}
