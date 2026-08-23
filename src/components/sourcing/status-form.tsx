import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { updateSourcingStatusAction } from "@/lib/sourcing/admin-actions"

export const SOURCING_STATUSES = ["new", "payment_pending", "paid", "sourcing", "quoted", "approved", "ordered", "completed"] as const

export function SourcingStatusForm({ id, status }: { id: string; status: string }) {
  return (
    <form action={updateSourcingStatusAction} className="flex flex-col gap-3 rounded-xl border bg-muted/30 p-4">
      <input type="hidden" name="id" value={id} />
      <Label htmlFor="status">Update request stage</Label>
      <Select id="status" name="status" defaultValue={status}>{SOURCING_STATUSES.map((item) => <option key={item} value={item}>{item.replaceAll("_", " ")}</option>)}</Select>
      <Label htmlFor="note">Customer email note (optional)</Label>
      <Textarea id="note" name="note" rows={3} maxLength={1000} placeholder="Add any stage-specific update…" />
      <Button type="submit">Update & notify customer</Button>
    </form>
  )
}
