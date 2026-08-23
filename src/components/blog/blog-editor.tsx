"use client"

import { useActionState } from "react"
import { Loader2, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { saveBlogPostAction } from "@/lib/blog/actions"

interface EditablePost {
  id: string; title: string; slug: string; excerpt: string | null; content: string;
  seoTitle: string | null; metaDescription: string | null; category: string | null;
  featuredImageUrl: string | null; videoUrl: string | null; status: "draft" | "published";
  publishedAt: Date | null
}

export function BlogEditor({ locale, post }: { locale: string; post?: EditablePost }) {
  const [state, action, pending] = useActionState(saveBlogPostAction, {})
  return (
    <form action={action} className="flex flex-col gap-5 rounded-2xl border bg-card p-5 shadow-sm sm:p-7">
      <input type="hidden" name="locale" value={locale} />
      <input type="hidden" name="id" value={post?.id ?? ""} />
      <input type="hidden" name="existingFeaturedImageUrl" value={post?.featuredImageUrl ?? ""} />
      <input type="hidden" name="existingVideoUrl" value={post?.videoUrl ?? ""} />
      <input type="hidden" name="existingPublishedAt" value={post?.publishedAt?.toISOString() ?? ""} />
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2"><Label htmlFor="title">Article title</Label><Input id="title" name="title" required minLength={3} defaultValue={post?.title} /></div>
        <div className="flex flex-col gap-2"><Label htmlFor="slug">URL slug</Label><Input id="slug" name="slug" required minLength={3} defaultValue={post?.slug} placeholder="how-to-import-from-china" /></div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2"><Label htmlFor="category">Category</Label><Input id="category" name="category" defaultValue={post?.category ?? ""} placeholder="Sourcing guides" /></div>
        <div className="flex flex-col gap-2"><Label htmlFor="status">Publishing status</Label><Select id="status" name="status" defaultValue={post?.status ?? "draft"}><option value="draft">Draft</option><option value="published">Published</option></Select></div>
      </div>
      <div className="flex flex-col gap-2"><Label htmlFor="excerpt">Excerpt / card summary</Label><Textarea id="excerpt" name="excerpt" rows={3} maxLength={500} defaultValue={post?.excerpt ?? ""} /></div>
      <div className="flex flex-col gap-2"><Label htmlFor="content">Article content</Label><Textarea id="content" name="content" required minLength={20} rows={18} defaultValue={post?.content} placeholder="Write the article here. Blank lines create new paragraphs." /><p className="text-xs text-muted-foreground">Plain text is rendered safely as readable paragraphs. You can update it any time.</p></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2"><Label htmlFor="seoTitle">SEO title (max 70)</Label><Input id="seoTitle" name="seoTitle" maxLength={70} defaultValue={post?.seoTitle ?? ""} /></div>
        <div className="flex flex-col gap-2"><Label htmlFor="metaDescription">Meta description (max 170)</Label><Textarea id="metaDescription" name="metaDescription" rows={3} maxLength={170} defaultValue={post?.metaDescription ?? ""} /></div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-2"><Label htmlFor="media">Featured image or hosted video</Label><Input id="media" name="media" type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime" className="h-auto py-2" /><p className="text-xs text-muted-foreground">Max 25 MB. Uploading an image sets the featured image; video sets the article video.</p></div>
        <div className="flex flex-col gap-2"><Label htmlFor="videoUrl">Or video URL</Label><Input id="videoUrl" name="videoUrl" type="url" defaultValue={post?.videoUrl ?? ""} placeholder="https://youtube.com/… or direct MP4" /></div>
      </div>
      {post?.featuredImageUrl ? <p className="text-xs text-muted-foreground">Current featured image: {post.featuredImageUrl}</p> : null}
      {state.error ? <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{state.error}</p> : null}
      <Button type="submit" size="lg" disabled={pending} className="self-start px-6">{pending ? <Loader2 className="animate-spin" aria-hidden /> : <Save aria-hidden />}{pending ? "Saving…" : "Save article"}</Button>
    </form>
  )
}
