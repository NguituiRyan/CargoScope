import type { Metadata } from "next"
import Image from "next/image"
import { notFound } from "next/navigation"
import { setRequestLocale } from "next-intl/server"

import { Link } from "@/i18n/navigation"
import { getPublishedPostBySlug } from "@/lib/blog/queries"

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const post = await getPublishedPostBySlug(slug)
  if (!post) return {}
  return {
    title: post.seoTitle || post.title,
    description: post.metaDescription || post.excerpt || undefined,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: { type: "article", title: post.seoTitle || post.title, description: post.metaDescription || post.excerpt || undefined, images: post.featuredImageUrl ? [post.featuredImageUrl] : undefined, publishedTime: post.publishedAt?.toISOString() },
  }
}

export default async function BlogPostPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params
  setRequestLocale(locale)
  const post = await getPublishedPostBySlug(slug)
  if (!post) notFound()
  const paragraphs = post.content.split(/\n\s*\n/).map((part) => part.trim()).filter(Boolean)
  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-12">
      <Link href="/blog" className="text-sm font-medium text-primary hover:underline">← All articles</Link>
      {post.category ? <p className="mt-8 text-xs font-bold tracking-[0.16em] text-primary uppercase">{post.category}</p> : null}
      <h1 className="mt-2 font-heading text-4xl font-bold tracking-tight text-balance sm:text-5xl">{post.title}</h1>
      {post.excerpt ? <p className="mt-5 text-lg leading-8 text-muted-foreground">{post.excerpt}</p> : null}
      {post.publishedAt ? <time className="mt-4 block text-sm text-muted-foreground" dateTime={post.publishedAt.toISOString()}>{new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(post.publishedAt)}</time> : null}
      {post.featuredImageUrl ? <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-2xl"><Image src={post.featuredImageUrl} alt={post.title} fill priority sizes="(max-width: 768px) 100vw, 768px" className="object-cover" /></div> : null}
      {post.videoUrl ? <div className="mt-8 overflow-hidden rounded-2xl border bg-black"><video controls preload="metadata" className="aspect-video w-full" src={post.videoUrl}>Your browser does not support embedded video.</video></div> : null}
      <div className="mt-9 space-y-6 text-base leading-8 text-foreground/90">{paragraphs.map((paragraph, index) => <p key={index} className="whitespace-pre-line">{paragraph}</p>)}</div>
      <div className="mt-12 rounded-2xl border-2 border-primary bg-primary/5 p-6"><h2 className="font-heading text-2xl font-bold">Need help sourcing a product?</h2><p className="mt-2 text-muted-foreground">Send ShopBuddy a photo, video or link and activate a managed supplier search.</p><Link href="/sourcing" className="mt-4 inline-flex rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground">Start a sourcing request</Link></div>
    </article>
  )
}
