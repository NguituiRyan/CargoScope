import type { Metadata } from "next"
import Image from "next/image"
import { setRequestLocale } from "next-intl/server"
import { ArrowRight, BookOpen } from "lucide-react"

import { Card, CardContent } from "@/components/ui/card"
import { Link } from "@/i18n/navigation"
import { getPublishedPosts } from "@/lib/blog/queries"

export const metadata: Metadata = {
  title: "Sourcing & Import Blog",
  description: "Practical Shopbuddy Africa guides for sourcing, supplier checks, importing and wholesale growth.",
  alternates: { canonical: "/blog" },
  openGraph: { type: "website", title: "Sourcing & Import Blog", description: "Practical Shopbuddy Africa guides for sourcing, supplier checks, importing and wholesale growth.", url: "/blog" },
}

export default async function BlogPage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params
  setRequestLocale(locale)
  const posts = await getPublishedPosts()
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-12">
      <div className="max-w-3xl"><p className="text-sm font-bold tracking-[0.18em] text-primary uppercase">Shopbuddy knowledge hub</p><h1 className="mt-2 font-heading text-4xl font-bold tracking-tight sm:text-5xl">Sourcing & import insights</h1><p className="mt-4 text-lg text-muted-foreground">Practical guidance for African businesses buying from verified suppliers and moving goods confidently.</p></div>
      {posts.length ? (
        <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {posts.map((post) => (
            <Card key={post.id} className="overflow-hidden p-0 transition hover:-translate-y-0.5 hover:shadow-md">
              {post.featuredImageUrl ? <div className="relative aspect-[16/9]"><Image src={post.featuredImageUrl} alt={post.title} fill sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw" className="object-cover" /></div> : <div className="grid aspect-[16/9] place-items-center bg-primary/10"><BookOpen className="size-10 text-primary" aria-hidden /></div>}
              <CardContent className="flex flex-1 flex-col p-5">
                {post.category ? <p className="text-xs font-bold tracking-wide text-primary uppercase">{post.category}</p> : null}
                <h2 className="mt-2 font-heading text-xl font-semibold text-balance">{post.title}</h2>
                {post.excerpt ? <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">{post.excerpt}</p> : null}
                <Link href={`/blog/${post.slug}`} className="mt-5 inline-flex items-center gap-1 text-sm font-bold text-primary">Read article <ArrowRight className="size-4" aria-hidden /></Link>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : <div className="mt-10 rounded-2xl border border-dashed p-10 text-center text-muted-foreground">Articles are being prepared. Check back soon.</div>}
    </div>
  )
}
