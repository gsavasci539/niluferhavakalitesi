// RainViewer public API helper
// Docs: https://www.rainviewer.com/api.html

export async function getRadarTimeline() {
  const url = 'https://api.rainviewer.com/public/weather-maps.json'
  const res = await fetch(url)
  if (!res.ok) throw new Error('RainViewer API error')
  const json = await res.json()
  // json.radar.past (array), json.radar.nowcast (array)
  const frames = [...(json?.radar?.past || []), ...(json?.radar?.nowcast || [])]
  return {
    frames, // each { time, path }
    host: json?.host || 'https://tilecache.rainviewer.com'
  }
}

export function frameToTileUrl(host, frame, options = {}) {
  const { color = 2, smoothing = 1, snow = 1, opacity = 1.0 } = options
  // 256px tiles
  // format: {host}/v2/radar/{time}/256/{z}/{x}/{y}/{color}/{smoothing}_{snow}.png
  const base = `${host}/v2/radar/${frame.time}/256/{z}/{x}/{y}/${color}/${smoothing}_${snow}.png`
  return { url: base, opacity }
}

export async function getRadarTimelineDetailed() {
  const url = 'https://api.rainviewer.com/public/weather-maps.json'
  const res = await fetch(url)
  if (!res.ok) throw new Error('RainViewer API error')
  const json = await res.json()
  const host = json?.host || 'https://tilecache.rainviewer.com'
  const past = json?.radar?.past || []
  const nowcast = json?.radar?.nowcast || []
  return { host, past, nowcast }
}
