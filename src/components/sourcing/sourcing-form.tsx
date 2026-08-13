"use client"

import { useActionState, useRef, useState } from "react"
import { Check, ImagePlus, Loader2, Send, ShieldCheck } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { compressProductImages } from "@/lib/images/compress"
import { trackBusinessEvent } from "@/lib/analytics/client"
import { submitSourcingRequestAction } from "@/lib/sourcing/actions"
import { SOURCING_ACCEPT } from "@/lib/sourcing/storage-shared"
import { uploadSourcingFiles } from "@/lib/sourcing/upload-client"
import { TurnstileWidget } from "@/components/security/turnstile-widget"

const ACTIVATION = [
  "Supplier research",
  "Supplier comparison",
  "China market search",
  "Initial price negotiation",
  "MOQ comparison",
  "Supplier communications",
  "Shortlisting suitable suppliers",
]

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <Label>{label}{required ? " *" : ""}</Label>
      {children}
    </div>
  )
}

export function SourcingForm({ imageSearchId }: { imageSearchId?: string }) {
  const [state, action, pending] = useActionState(async (previous: { error?: string; reference?: string }, formData: FormData) => {
    try {
      const selected = formData.getAll("attachments").filter((item): item is File => item instanceof File && item.size > 0)
      if (selected.length) {
        const uploaded = await uploadSourcingFiles(selected)
        formData.delete("attachments")
        formData.set("preUploadedAttachments", JSON.stringify(uploaded))
      }
      return await submitSourcingRequestAction(previous, formData)
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Upload failed. Please try again." }
    }
  }, {})
  const [startedAt] = useState(() => Date.now())
  const [files, setFiles] = useState<string[]>([])
  const inputRef = useRef<HTMLInputElement>(null)

  async function prepareFiles(event: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(event.currentTarget.files ?? []).slice(0, 4)
    if (!selected.length) return
    const compressed = await compressProductImages(selected)
    if (inputRef.current && typeof DataTransfer !== "undefined") {
      const transfer = new DataTransfer()
      compressed.forEach((file) => transfer.items.add(file))
      inputRef.current.files = transfer.files
    }
    setFiles(compressed.map((file) => file.name))
  }

  return (
    <form action={action} className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_22rem]">
      <input type="hidden" name="formStartedAt" value={startedAt} />
      <input type="hidden" name="website" value="" />
      <input type="hidden" name="imageSearchId" value={imageSearchId ?? ""} />
      <div className="flex flex-col gap-5 rounded-2xl border bg-card p-4 shadow-sm sm:p-6">
        {imageSearchId ? (
          <div className="rounded-xl border border-verified bg-verified/20 p-3 text-sm text-verified-foreground">
            Your image search upload is attached to this request.
          </div>
        ) : null}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Product name" required>
            <Input name="productName" required minLength={2} maxLength={180} placeholder="e.g. Solar water pump (or ‘Unknown — see image’)" />
          </Field>
          <Field label="Product link">
            <Input name="productLink" type="url" inputMode="url" maxLength={1000} placeholder="https://…" />
          </Field>
        </div>
        <Field label="Product image or video">
          <label className="flex min-h-28 cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-primary/60 bg-primary/5 px-4 py-5 text-center transition hover:bg-primary/10">
            <ImagePlus className="size-7 text-primary" aria-hidden />
            <span className="font-semibold">Attach up to 4 images or videos</span>
            <span className="text-xs text-muted-foreground">Images are compressed for fast mobile upload. Max 25 MB per file.</span>
            <input ref={inputRef} type="file" name="attachments" accept={SOURCING_ACCEPT} multiple className="sr-only" onChange={prepareFiles} />
          </label>
          {files.length ? <p className="text-xs text-muted-foreground">{files.join(", ")}</p> : null}
        </Field>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="MOQ / quantity" required><Input name="quantity" type="number" inputMode="numeric" min={1} required placeholder="500" /></Field>
          <Field label="Unit" required><Input name="unit" required defaultValue="pieces" maxLength={30} /></Field>
          <Field label="Quality preference" required>
            <Select name="qualityPreference" defaultValue="standard" required>
              <option value="premium">Premium</option><option value="standard">Standard</option><option value="budget">Budget</option>
            </Select>
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Target budget"><Input name="targetBudget" type="number" inputMode="decimal" min={0} step="0.01" placeholder="Total or target unit budget" /></Field>
          <Field label="Budget currency"><Select name="targetBudgetCurrency" defaultValue="USD"><option>USD</option><option>KES</option><option>CNY</option></Select></Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Destination country" required><Input name="destinationCountry" required placeholder="Kenya" /></Field>
          <Field label="City"><Input name="destinationCity" placeholder="Nairobi" /></Field>
          <Field label="Port"><Input name="destinationPort" placeholder="Mombasa" /></Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="flex items-center gap-3 rounded-xl border p-3 text-sm font-medium">
            <input type="checkbox" name="privateLabeling" className="size-5 accent-primary" /> Brand / private labeling required
          </label>
          <Field label="Brand name"><Input name="brandName" placeholder="If applicable" /></Field>
        </div>
        <Field label="Special requirement notes"><Textarea name="specialRequirements" rows={5} maxLength={2000} placeholder="Materials, dimensions, packaging, certifications, colors, deadlines…" /></Field>
        <div className="border-t pt-5">
          <h2 className="mb-4 font-heading text-xl font-semibold">Client details</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Client name" required><Input name="clientName" required autoComplete="name" /></Field>
            <Field label="Business name"><Input name="businessName" autoComplete="organization" /></Field>
            <Field label="WhatsApp" required><Input name="whatsapp" type="tel" inputMode="tel" required autoComplete="tel" placeholder="+254…" /></Field>
            <Field label="Email" required><Input name="email" type="email" inputMode="email" required autoComplete="email" /></Field>
          </div>
        </div>
        {state.error ? (
          <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
            {state.error}{state.reference ? ` Your saved reference is ${state.reference}.` : ""}
          </div>
        ) : null}
        <TurnstileWidget />
      </div>

      <aside className="h-fit rounded-2xl border-2 border-primary bg-card p-5 shadow-lg lg:sticky lg:top-20">
        <div className="flex items-center gap-2 text-primary"><ShieldCheck className="size-6" aria-hidden /><span className="text-sm font-bold tracking-wide uppercase">Sourcing activation</span></div>
        <p className="mt-3 font-heading text-4xl font-bold">US$100</p>
        <p className="mt-2 text-sm text-muted-foreground">Payable before sourcing begins. This is an activation fee for the work below, not a product deposit.</p>
        <p className="mt-5 text-sm font-bold">US$100 ACTIVATES:</p>
        <ul className="mt-3 flex flex-col gap-2.5">
          {ACTIVATION.map((item) => <li key={item} className="flex items-start gap-2 text-sm"><Check className="mt-0.5 size-4 shrink-0 text-verified-foreground" aria-hidden />{item}</li>)}
        </ul>
        <Button
          type="submit"
          size="lg"
          disabled={pending}
          onClick={() => {
            trackBusinessEvent("sourcing_started")
          }}
          className="mt-6 h-12 w-full text-base font-bold"
        >
          {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Send aria-hidden />}
          {pending ? "Sending request…" : "Submit Sourcing Request"}
        </Button>
        <p className="mt-3 text-center text-xs text-muted-foreground">After submission, our sourcing team will review your requirements and contact you by WhatsApp or email with the next steps.</p>
      </aside>
    </form>
  )
}
