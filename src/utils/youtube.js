function parseTimeValue(raw) {
  if (!raw) return null

  const value = String(raw).trim().toLowerCase()
  if (!value) return null

  if (/^\d+$/.test(value)) {
    return Number(value)
  }

  const match = value.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/)
  if (!match) return null

  const hours = Number(match[1] || 0)
  const minutes = Number(match[2] || 0)
  const seconds = Number(match[3] || 0)
  const total = hours * 3600 + minutes * 60 + seconds

  return total > 0 ? total : null
}

function isAllowedYouTubeHost(hostname) {
  const host = hostname.replace(/^www\./, '')
  return host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtu.be'
}

export function sanitizeYouTubeUrl(rawUrl) {
  if (!rawUrl || !rawUrl.trim()) {
    return ''
  }

  let parsed
  try {
    parsed = new URL(rawUrl.trim())
  } catch {
    return ''
  }

  if (parsed.protocol !== 'https:') {
    return ''
  }

  if (!isAllowedYouTubeHost(parsed.hostname)) {
    return ''
  }

  return parsed.toString()
}

export function isSafeYouTubeUrl(rawUrl) {
  return Boolean(sanitizeYouTubeUrl(rawUrl))
}

function extractVideoId(url) {
  const host = url.hostname.replace(/^www\./, '')

  if (host === 'youtu.be') {
    const id = url.pathname.slice(1)
    return id || null
  }

  if (host === 'youtube.com' || host === 'm.youtube.com') {
    if (url.pathname === '/watch') {
      return url.searchParams.get('v')
    }

    const pathParts = url.pathname.split('/').filter(Boolean)
    if (pathParts[0] === 'embed' || pathParts[0] === 'shorts') {
      return pathParts[1] || null
    }
  }

  return null
}

export function buildYouTubeEmbedUrl(rawUrl) {
  const safeUrl = sanitizeYouTubeUrl(rawUrl)
  if (!safeUrl) {
    return null
  }

  const parsed = new URL(safeUrl)

  const videoId = extractVideoId(parsed)
  if (!videoId) {
    return null
  }

  const start =
    parseTimeValue(parsed.searchParams.get('start')) ||
    parseTimeValue(parsed.searchParams.get('t'))
  const end = parseTimeValue(parsed.searchParams.get('end'))

  const embed = new URL(`https://www.youtube.com/embed/${videoId}`)
  embed.searchParams.set('autoplay', '1')
  embed.searchParams.set('rel', '0')
  embed.searchParams.set('modestbranding', '1')

  if (start) {
    embed.searchParams.set('start', String(start))
  }

  if (end && (!start || end > start)) {
    embed.searchParams.set('end', String(end))
  }

  return embed.toString()
}