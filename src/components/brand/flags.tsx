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
        <rect width="60" height="12.5" fill="#000" />
        <rect y="14" width="60" height="12" fill="#bb0000" />
        <rect y="27.5" width="60" height="12.5" fill="#006600" />
        {/* two crossed Maasai spears, behind the shield */}
        <g fill="#fff">
          <g transform="rotate(28 30 20)">
            <rect x="29.5" y="5.5" width="1" height="29" rx="0.5" />
            <path d="M30,3.2 L28.6,8.5 L31.4,8.5 Z" />
          </g>
          <g transform="rotate(-28 30 20)">
            <rect x="29.5" y="5.5" width="1" height="29" rx="0.5" />
            <path d="M30,3.2 L28.6,8.5 L31.4,8.5 Z" />
          </g>
        </g>
        {/* Maasai shield: white border, red body, black centre with white detail */}
        <path d="M30,8 C35,12.5 35,27.5 30,32 C25,27.5 25,12.5 30,8 Z" fill="#fff" />
        <path d="M30,9.4 C34,13 34,27 30,30.6 C26,27 26,13 30,9.4 Z" fill="#bb0000" />
        <ellipse cx="30" cy="20" rx="2.4" ry="5" fill="#fff" />
        <ellipse cx="30" cy="20" rx="1.7" ry="4.2" fill="#000" />
        <rect x="29.7" y="15" width="0.6" height="10" fill="#fff" />
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
