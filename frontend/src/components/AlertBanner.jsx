import React from 'react'

export default function AlertBanner({ pm25 = 0 }) {
  let level = 'good'
  if (pm25 >= 12 && pm25 < 35.5) level = 'moderate'
  else if (pm25 >= 35.5 && pm25 < 55.5) level = 'usg'
  else if (pm25 >= 55.5) level = 'unhealthy'

  if (level === 'good') return null

  const text = {
    moderate: 'Hava kalitesi orta düzeyde. Hassas gruplar dikkatli olmalı.',
    usg: 'Hassas gruplar için sağlıksız. Açık hava aktivitelerini azaltın.',
    unhealthy: 'Sağlıksız hava! Açık hava aktivitelerini kısıtlayın.',
  }[level]

  return (
    <div className={`alert-banner ${level}`}>
      <div className="container">
        <strong>Uyarı:</strong> {text} (PM2.5: {pm25})
      </div>
    </div>
  )
}
