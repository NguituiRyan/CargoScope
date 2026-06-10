"use client"

import { useTranslations } from "next-intl"

import { deleteRfqAction } from "@/lib/rfq/actions"
import { buttonVariants } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/** Delete control for a buyer's own RFQ, with a confirm step. */
export function DeleteRfqButton({ rfqId }: { rfqId: string }) {
  const t = useTranslations("rfq")
  return (
    <form
      action={deleteRfqAction}
      onSubmit={(e) => {
        if (!window.confirm(t("manageDeleteConfirm"))) e.preventDefault()
      }}
    >
      <input type="hidden" name="rfqId" value={rfqId} />
      <button
        type="submit"
        className={cn(
          buttonVariants({ variant: "outline", size: "sm" }),
          "text-destructive hover:bg-destructive/10"
        )}
      >
        {t("manageDelete")}
      </button>
    </form>
  )
}
