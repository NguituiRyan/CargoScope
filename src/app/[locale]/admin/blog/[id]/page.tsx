import { notFound } from "next/navigation"
import { setRequestLocale } from "next-intl/server"
import { BlogEditor } from "@/components/blog/blog-editor"
import { getPostForAdmin } from "@/lib/blog/queries"

export default async function EditBlogPostPage({ params }: { params: Promise<{ locale: string; id: string }> }) {
  const { locale, id } = await params
  setRequestLocale(locale)
  const post = await getPostForAdmin(id)
  if (!post) notFound()
  return <div className="flex flex-col gap-5"><div><p className="text-sm font-bold text-primary uppercase">Blog CMS</p><h1 className="font-heading text-3xl font-bold">Edit article</h1></div><BlogEditor locale={locale} post={post} /></div>
}
