const MAX_DIMENSION = 1600
const WEBP_QUALITY = 0.82

function replaceExtension(fileName: string, extension: string): string {
  const base = fileName.replace(/\.[^.]+$/, '').trim()
  return `${base || 'photo'}${extension}`
}

/**
 * Resize (max 1600px) and encode any image file as WebP.
 * Falls back to the original file if encoding fails (e.g. unsupported type).
 */
export async function compressImageToWebp(file: File): Promise<File> {
  if (!file.type.startsWith('image/') && file.type !== '') {
    return file
  }

  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    return file
  }

  try {
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height))
    const width = Math.max(1, Math.round(bitmap.width * scale))
    const height = Math.max(1, Math.round(bitmap.height * scale))

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height

    const ctx = canvas.getContext('2d')
    if (!ctx) return file

    ctx.drawImage(bitmap, 0, 0, width, height)

    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob(resolve, 'image/webp', WEBP_QUALITY)
    })

    if (!blob || blob.size === 0) return file

    return new File([blob], replaceExtension(file.name, '.webp'), {
      type: 'image/webp',
      lastModified: Date.now(),
    })
  } finally {
    bitmap.close()
  }
}

export async function compressImagesToWebp(files: File[]): Promise<File[]> {
  return Promise.all(files.map((file) => compressImageToWebp(file)))
}
