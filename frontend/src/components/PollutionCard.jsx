import React from 'react'

export default function PollutionCard({ meta, baseValues, onUpdate, loading }) {
  const windText = meta
    ? `${meta.wind_dir_deg}°${meta.wind_dir_compass && meta.wind_dir_compass !== '-' ? ` ${meta.wind_dir_compass}` : ''}`
    : '-'

  return (
    <div className="card">
      <div className="card-header">
        <h3>Hava Kalitesi Verileri</h3>
      </div>
      <div className="card-body">
        <div className="grid two">
          <div className="metric">
            <span className="label">PM2.5</span>
            <span className="value colored" style={{color: baseValues.color}}>{baseValues.pm25}</span>
          </div>
          <div className="metric">
            <span className="label">PM10</span>
            <span className="value">{baseValues.pm10}</span>
          </div>
          <div className="metric">
            <span className="label">NO₂</span>
            <span className="value">{baseValues.no2}</span>
          </div>
          <div className="metric">
            <span className="label">SO₂</span>
            <span className="value">{baseValues.so2}</span>
          </div>
          <div className="metric">
            <span className="label">CO</span>
            <span className="value">{baseValues.co}</span>
          </div>
          <div className="metric">
            <span className="label">Rüzgâr Hızı</span>
            <span className="value">{meta ? meta.wind_speed : '-'} m/s</span>
          </div>
          <div className="metric">
            <span className="label">Rüzgâr Yönü</span>
            <span className="value">{windText}</span>
          </div>
        </div>
        <button className="btn primary full" onClick={onUpdate} disabled={loading}>
          {loading ? 'Güncelleniyor...' : 'Verileri Güncelle'}
        </button>
      </div>
    </div>
  )
}
