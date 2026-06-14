const CONTROL_CHARS_REGEX = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/g
const TAG_REGEX = /<[^>]*>/g
const UNSAFE_PATTERN_REGEX = /<\s*\/??\s*script|javascript\s*:|on[a-z]+\s*=|<|>/i

export function sanitizePlainText(value, maxLength = 300) {
  if (typeof value !== 'string') {
    return ''
  }

  const normalized = value
    .normalize('NFKC')
    .replace(/\r\n?/g, '\n')
    .replace(CONTROL_CHARS_REGEX, '')
    .replace(TAG_REGEX, '')

  return normalized.slice(0, maxLength).trim()
}

export function isPotentiallyUnsafeText(value) {
  if (typeof value !== 'string' || !value.trim()) {
    return false
  }

  return UNSAFE_PATTERN_REGEX.test(value)
}