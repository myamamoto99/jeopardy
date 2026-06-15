export function sanitizeImageUrl(rawUrl) {
  if (!rawUrl || !rawUrl.trim()) return ''

  let parsed
  try {
    parsed = new URL(rawUrl.trim())
  } catch {
    return ''
  }

  if (parsed.protocol !== 'https:') return ''
  if (!parsed.hostname) return ''

  return parsed.toString()
}

export function isSafeImageUrl(rawUrl) {
  return Boolean(sanitizeImageUrl(rawUrl))
}
