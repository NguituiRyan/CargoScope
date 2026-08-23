import "server-only"

import { cache } from "react"
import { desc, eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { blogPosts } from "@/lib/db/schema"

export const getPublishedPosts = cache(async () =>
  db.select().from(blogPosts).where(eq(blogPosts.status, "published")).orderBy(desc(blogPosts.publishedAt), desc(blogPosts.createdAt)).limit(100)
)

export const getPublishedPostBySlug = cache(async (slug: string) => {
  const [post] = await db.select().from(blogPosts).where(eq(blogPosts.slug, slug)).limit(1)
  return post?.status === "published" ? post : null
})

export async function getAllPostsForAdmin() {
  return db.select().from(blogPosts).orderBy(desc(blogPosts.updatedAt)).limit(500)
}

export async function getPostForAdmin(id: string) {
  const [post] = await db.select().from(blogPosts).where(eq(blogPosts.id, id)).limit(1)
  return post ?? null
}
