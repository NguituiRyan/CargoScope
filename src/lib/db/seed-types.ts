/** Shared demo-seed types — no side effects, safe to import anywhere. */
export type Tier = [number, string]

export interface ProductSeed {
  mfr: string
  cat: string
  title: string
  desc: string
  moq: number
  unit: string
  lead: number
  hs: string
  certs?: string[]
  customizable?: boolean
  sample: string | null
  tiers: Tier[]
  img?: string
}
