"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { z } from "zod"

import { localePath, requireRole } from "@/lib/auth/session"
import { storeBlogMedia } from "@/lib/blog/storage"
import { createAdminClient } from "@/lib/supabase/admin"

const schema = z.object({
  title: z.string().trim().min(3).max(180),
  slug: z.string().trim().min(3).max(180),
  excerpt: z.string().trim().max(500).optional().or(z.literal("")),
  content: z.string().trim().min(20).max(100_000),
  seoTitle: z.string().trim().max(70).optional().or(z.literal("")),
  metaDescription: z.string().trim().max(170).optional().or(z.literal("")),
  category: z.string().trim().max(80).optional().or(z.literal("")),
  videoUrl: z.string().trim().max(1000).optional().or(z.literal("")),
  status: z.enum(["draft", "published"]),
})

function cleanSlug(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")
}

export interface BlogActionState { error?: string }

export async function saveBlogPostAction(_state: BlogActionState, formData: FormData): Promise<BlogActionState> {
  const user = await requireRole("admin")
  const locale = String(formData.get("locale") ?? "en")
  const parsed = schema.safeParse({
    title: formData.get("title"), slug: formData.get("slug"), excerpt: formData.get("excerpt"),
    content: formData.get("content"), seoTitle: formData.get("seoTitle"),
    metaDescription: formData.get("metaDescription"), category: formData.get("category"),
    videoUrl: formData.get("videoUrl"), status: formData.get("status"),
  })
  if (!parsed.success) return { error: parsed.error.issues[0]?.message || "Check the article fields." }
  const d = parsed.data
  const slug = cleanSlug(d.slug)
  if (!slug) return { error: "Enter a valid URL slug." }

  const id = String(formData.get("id") ?? "").trim()
  let featuredImageUrl = String(formData.get("existingFeaturedImageUrl") ?? "").trim() || null
  let videoUrl = d.videoUrl || String(formData.get("existingVideoUrl") ?? "").trim() || null
  const media = formData.get("media")
  if (media instanceof File && media.size > 0) {
    const stored = await storeBlogMedia(media)
    if (!stored) return { error: "Media must be a supported image/video under 25 MB." }
    if (stored.type === "image") featuredImageUrl = stored.url
    else videoUrl = stored.url
  }
  const now = new Date().toISOString()
  const record = {
    author_profile_id: user.id,
    title: d.title,
    slug,
    excerpt: d.excerpt || null,
    content: d.content,
    seo_title: d.seoTitle || null,
    meta_description: d.metaDescription || null,
    category: d.category || null,
    featured_image_url: featuredImageUrl,
    video_url: videoUrl,
    status: d.status,
    published_at: d.status === "published" ? (String(formData.get("existingPublishedAt") ?? "") || now) : null,
    updated_at: now,
  }
  const admin = createAdminClient()
  const result = id
    ? await admin.from("blog_posts").update(record).eq("id", id)
    : await admin.from("blog_posts").insert(record)
  if (result.error) {
    return { error: result.error.code === "23505" ? "That URL slug is already in use." : "Could not save the article." }
  }
  revalidatePath("/blog")
  revalidatePath(`/blog/${slug}`)
  revalidatePath(localePath(locale, "/admin/blog"))
  redirect(localePath(locale, "/admin/blog"))
}

export async function deleteBlogPostAction(formData: FormData): Promise<void> {
  await requireRole("admin")
  const id = String(formData.get("id") ?? "")
  const locale = String(formData.get("locale") ?? "en")
  if (id) await createAdminClient().from("blog_posts").delete().eq("id", id)
  revalidatePath("/blog")
  revalidatePath(localePath(locale, "/admin/blog"))
}
