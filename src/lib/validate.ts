export const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])
export const MAX_IMAGE_SIZE = 20 * 1024 * 1024 // 20MB

export function validateImageFile(file: File): string | null {
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) return 'Ungültiger Dateityp. Nur JPEG, PNG, WebP und GIF sind erlaubt.'
  if (file.size > MAX_IMAGE_SIZE) return 'Datei zu groß. Maximale Größe ist 20MB.'
  return null
}

export function safeParseJson<T>(val: unknown): T | null {
  if (!val) return null
  try { return JSON.parse(val as string) as T } catch { return null }
}
