import type { Metadata } from "next"
import type { ReactNode } from "react"
import Image from "next/image"
import { notFound } from "next/navigation"
import { setRequestLocale } from "next-intl/server"

import { Link } from "@/i18n/navigation"
import { getPublishedPostBySlug } from "@/lib/blog/queries"
import { SITE_URL } from "@/lib/site"

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

type Block =
  | { kind: "h2" | "h3" | "p"; text: string }
  | { kind: "ul" | "ol"; items: string[] }

const HEADING = /^(###|##)\s+(.+)$/
const BULLET = /^-\s+(.+)$/
const NUMBERED = /^\d+[.)]\s+(.+)$/

/** Markdown subset only (## / ### / - / 1. / **bold**) so post content never becomes raw HTML. */
function parseBlocks(source: string): Block[] {
  const lines = source.replace(/\r\n?/g, "\n").split("\n").map((line) => line.trim())
  const blocks: Block[] = []
  let para: string[] = []
  const flush = () => {
    if (para.length) blocks.push({ kind: "p", text: para.join("\n") })
    para = []
  }
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    if (!line) {
      flush()
      continue
    }
    const heading = HEADING.exec(line)
    if (heading) {
      flush()
      blocks.push({ kind: heading[1] === "###" ? "h3" : "h2", text: heading[2] })
      continue
    }
    const kind = BULLET.test(line) ? "ul" : NUMBERED.test(line) ? "ol" : null
    if (kind) {
      flush()
      const marker = kind === "ul" ? BULLET : NUMBERED
      const items: string[] = []
      for (; i < lines.length; i++) {
        const item = marker.exec(lines[i])
        if (!item) break
        items.push(item[1])
      }
      i-- // step back so the loop re-reads the line that ended the list
      blocks.push({ kind, items })
      continue
    }
    para.push(line)
  }
  flush()
  return blocks
}

// Odd split segments are the **bold** captures.
function renderInline(text: string, key: string): ReactNode[] {
  return text.split(/\*\*(.+?)\*\*/g).map((chunk, index) => (index % 2 ? <strong key={`${key}-${index}`} className="font-semibold text-foreground">{chunk}</strong> : chunk))
}

function renderContent(source: string): ReactNode[] {
  return parseBlocks(source).map((block, index) => {
    const key = `block-${index}`
    switch (block.kind) {
      case "h2":
        return <h2 key={key} className="mt-10 mb-3 font-heading text-2xl font-bold tracking-tight sm:text-3xl">{renderInline(block.text, key)}</h2>
      case "h3":
        return <h3 key={key} className="mt-8 mb-2 font-heading text-xl font-semibold tracking-tight">{renderInline(block.text, key)}</h3>
      case "ul":
        return <ul key={key} className="my-5 list-disc space-y-2 pl-6">{block.items.map((item, i) => <li key={`${key}-${i}`}>{renderInline(item, `${key}-${i}`)}</li>)}</ul>
      case "ol":
        return <ol key={key} className="my-5 list-decimal space-y-2 pl-6">{block.items.map((item, i) => <li key={`${key}-${i}`}>{renderInline(item, `${key}-${i}`)}</li>)}</ol>
      default:
        return <p key={key} className="my-5 whitespace-pre-line">{renderInline(block.text, key)}</p>
    }
  })
}

const absoluteUrl = (url: string) => (/^https?:\/\//i.test(url) ? url : `${SITE_URL}${url.startsWith("/") ? "" : "/"}${url}`)

export default async function BlogPostPage({ params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params
  setRequestLocale(locale)
  const post = await getPublishedPostBySlug(slug)
  if (!post) notFound()
  const organization = { "@type": "Organization", name: "Shopbuddy" }
  const description = post.metaDescription || post.excerpt
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.seoTitle || post.title,
    ...(description ? { description } : {}),
    ...(post.featuredImageUrl ? { image: absoluteUrl(post.featuredImageUrl) } : {}),
    ...(post.publishedAt ? { datePublished: post.publishedAt.toISOString() } : {}),
    ...(post.updatedAt ? { dateModified: post.updatedAt.toISOString() } : {}),
    author: organization,
    publisher: organization,
    mainEntityOfPage: `${SITE_URL}/blog/${post.slug}`,
  }
  return (
    <article className="mx-auto w-full max-w-3xl px-4 py-12">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />
      <Link href="/blog" className="text-sm font-medium text-primary hover:underline">← All articles</Link>
      {post.category ? <p className="mt-8 text-xs font-bold tracking-[0.16em] text-primary uppercase">{post.category}</p> : null}
      <h1 className="mt-2 font-heading text-4xl font-bold tracking-tight text-balance sm:text-5xl">{post.title}</h1>
      {post.excerpt ? <p className="mt-5 text-lg leading-8 text-muted-foreground">{post.excerpt}</p> : null}
      {post.publishedAt ? <time className="mt-4 block text-sm text-muted-foreground" dateTime={post.publishedAt.toISOString()}>{new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(post.publishedAt)}</time> : null}
      {post.featuredImageUrl ? <div className="relative mt-8 aspect-[16/9] overflow-hidden rounded-2xl"><Image src={post.featuredImageUrl} alt={post.title} fill priority sizes="(max-width: 768px) 100vw, 768px" className="object-cover" /></div> : null}
      {post.videoUrl ? <div className="mt-8 overflow-hidden rounded-2xl border bg-black"><video controls preload="metadata" className="aspect-video w-full" src={post.videoUrl}>Your browser does not support embedded video.</video></div> : null}
      <div className="mt-9 text-base leading-8 text-foreground/90">{renderContent(post.content)}</div>
      <div className="mt-12 rounded-2xl border-2 border-primary bg-primary/5 p-6"><h2 className="font-heading text-2xl font-bold">Need help sourcing a product?</h2><p className="mt-2 text-muted-foreground">Send Shopbuddy a photo, video or link and we&apos;ll source it for you — free to start.</p><Link href="/sourcing" className="mt-4 inline-flex rounded-lg bg-primary px-5 py-2.5 text-sm font-bold text-primary-foreground">Start a sourcing request</Link></div>
    </article>
  )
}
