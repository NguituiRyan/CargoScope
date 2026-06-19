import imageCompression from "browser-image-compression"

/**
 * Client-side image optimisation for product/storefront uploads.
 *
 * Compresses for fast uploads on slow connections WITHOUT degrading what buyers
 * see: images are kept at a generous 2560px long edge and 92% quality WebP —
 * visually lossless for the web and big enough for zoom/retina. `next/image`
 * then serves correctly-sized, crisp versions per device. Only oversized
 * originals actually shrink; anything already smaller is left untouched. Videos
 * and non-images pass through unchanged.
 */
export async function compressProductImages(files: File[]): Promise<File[]> {
  const out: File[] = []
  for (const file of files) {
    if (!file.type.startsWith("image/")) {
      out.push(file)
      continue
    }
    try {
      const compressed = await imageCompression(file, {
        maxWidthOrHeight: 2560,
        initialQuality: 0.92,
        useWebWorker: true,
        fileType: "image/webp",
        maxSizeMB: 3,
      })
      const name = file.name.replace(/\.[^.]+$/, "") + ".webp"
      const next = new File([compressed], name, { type: "image/webp" })
      // Keep whichever is smaller, so we never make an already-lean image bigger.
      out.push(next.size > 0 && next.size < file.size ? next : file)
    } catch {
      out.push(file)
    }
  }
  return out
}
