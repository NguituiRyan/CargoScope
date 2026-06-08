import { cn } from "@/lib/utils"

export type FlagCode = "gb" | "ke" | "cn"

// Unit 5-point star (centred, point up, outer radius 1) reused for the CN flag.
const STAR =
  "M0,-1 L0.2245,-0.309 L0.951,-0.309 L0.363,0.118 L0.588,0.809 L0,0.382 L-0.588,0.809 L-0.363,0.118 L-0.951,-0.309 L-0.2245,-0.309 Z"

/**
 * Small inline SVG flags (GB / KE / CN) for the language switcher. Inline (not
 * emoji) so they render as actual flags on every platform — emoji flags show as
 * plain letters on Windows. All use a 3:2 (60×40) viewBox.
 */
export function Flag({ code, className }: { code: FlagCode; className?: string }) {
  const cls = cn("inline-block shrink-0 overflow-hidden rounded-[2px]", className)

  if (code === "gb") {
    return (
      <svg viewBox="0 0 60 40" className={cls} role="img" aria-hidden>
        <rect width="60" height="40" fill="#012169" />
        <path d="M0,0 60,40 M60,0 0,40" stroke="#fff" strokeWidth="8" />
        <path d="M0,0 60,40 M60,0 0,40" stroke="#c8102e" strokeWidth="5" />
        <path d="M30,0 V40 M0,20 H60" stroke="#fff" strokeWidth="12" />
        <path d="M30,0 V40 M0,20 H60" stroke="#c8102e" strokeWidth="7" />
      </svg>
    )
  }

  if (code === "ke") {
    return (
      <svg viewBox="0 0 60 40" className={cls} role="img" aria-hidden>
        <rect width="60" height="40" fill="#fff" />
        <rect width="60" height="12" fill="#000" />
        <rect y="14" width="60" height="12" fill="#bb0000" />
        <rect y="28" width="60" height="12" fill="#006600" />
        <ellipse cx="30" cy="20" rx="6" ry="13" fill="#fff" />
        <ellipse cx="30" cy="20" rx="5" ry="11.5" fill="#bb0000" />
        <ellipse cx="30" cy="20" rx="2" ry="7" fill="#000" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 60 40" className={cls} role="img" aria-hidden>
      <rect width="60" height="40" fill="#de2910" />
      <g fill="#ffde00">
        <g transform="translate(11,11) scale(7)">
          <path d={STAR} />
        </g>
        <g transform="translate(22,4) scale(2.3)">
          <path d={STAR} />
        </g>
        <g transform="translate(27,9) scale(2.3)">
          <path d={STAR} />
        </g>
        <g transform="translate(27,15) scale(2.3)">
          <path d={STAR} />
        </g>
        <g transform="translate(22,20) scale(2.3)">
          <path d={STAR} />
        </g>
      </g>
    </svg>
  )
}
