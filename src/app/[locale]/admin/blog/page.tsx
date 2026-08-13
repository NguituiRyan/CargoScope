import { Plus } from "lucide-react"
import { setRequestLocale } from "next-intl/server"

import { buttonVariants } from "@/components/ui/button"
import { deleteBlogPostAction } from "@/lib/blog/actions"
import { getAllPostsForAdmin } from "@/lib/blog/queries"
import { Link } from "@/i18n/navigation"
import { cn } from "@/lib/utils"

export default async function AdminBlogPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  const posts = await getAllPostsForAdmin()
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4"><div><p className="text-sm font-bold text-primary uppercase">Blog CMS</p><h1 className="font-heading text-3xl font-bold">Articles</h1><p className="mt-1 text-sm text-muted-foreground">Create drafts, publish articles, and manage SEO and media without developer help.</p></div><Link href="/admin/blog/new" className={cn(buttonVariants({ size: "lg" }))}><Plus aria-hidden /> New article</Link></div>
      <div className="overflow-x-auto rounded-xl border bg-card">
        <table className="w-full min-w-[680px] text-left text-sm"><thead className="border-b bg-muted/50 text-xs uppercase text-muted-foreground"><tr><th className="px-4 py-3">Article</th><th className="px-4 py-3">Category</th><th className="px-4 py-3">Status</th><th className="px-4 py-3">Updated</th><th className="px-4 py-3">Actions</th></tr></thead><tbody>
          {posts.map((post) => <tr key={post.id} className="border-b last:border-0"><td className="px-4 py-3 font-medium">{post.title}<div className="text-xs font-normal text-muted-foreground">/blog/{post.slug}</div></td><td className="px-4 py-3">{post.category || "—"}</td><td className="px-4 py-3"><span className={post.status === "published" ? "rounded-full bg-verified/30 px-2 py-1 text-xs font-semibold text-verified-foreground" : "rounded-full bg-muted px-2 py-1 text-xs font-semibold"}>{post.status}</span></td><td className="px-4 py-3 text-muted-foreground">{post.updatedAt.toLocaleDateString()}</td><td className="px-4 py-3"><div className="flex gap-2"><Link href={`/admin/blog/${post.id}`} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>Edit</Link><form action={deleteBlogPostAction}><input type="hidden" name="id" value={post.id} /><input type="hidden" name="locale" value={locale} /><button type="submit" className="rounded-lg px-2.5 py-1.5 text-xs font-medium text-destructive hover:bg-destructive/10">Delete</button></form></div></td></tr>)}
        </tbody></table>
        {!posts.length ? <p className="p-8 text-center text-muted-foreground">No articles yet.</p> : null}
      </div>
    </div>
  )
}
