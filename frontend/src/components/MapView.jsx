import React, { useEffect, useRef, useState } from 'react'
import { MapContainer, TileLayer, Circle, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'

// Fix default icon paths for Leaflet when bundled
import 'leaflet/dist/leaflet.css'

// Bursa Nilüfer default center
const CENTER = [40.232, 28.949]

function FitBounds({ points }) {
  const map = useMap()
  useEffect(() => {
    if (!points || points.length === 0) return
    const latlngs = points.map(p => [p.lat, p.lng])
    const bounds = L.latLngBounds(latlngs)
    map.fitBounds(bounds.pad(0.25))
  }, [points, map])
  return null
}

function Toolbar({ radarEnabled, onToggleRadar, outerRef }) {
  const map = useMap()
  const zoomIn = () => map.zoomIn()
  const zoomOut = () => map.zoomOut()
  const onFullscreen = () => {
    const el = outerRef?.current
    if (!el) return
    if (!document.fullscreenElement) el.requestFullscreen?.()
    else document.exitFullscreen?.()
  }
  return (
    <div className="map-toolbar">
      <button className="tool-btn" title="Yakınlaştır" onClick={zoomIn}>+</button>
      <button className="tool-btn" title="Uzaklaştır" onClick={zoomOut}>−</button>
      <button className={`tool-btn ${radarEnabled? 'active':''}`} title={radarEnabled? 'Radar açık – kapat' : 'Radar kapalı – aç'} onClick={onToggleRadar}>
        {radarEnabled ? '📡' : '☁️'}
      </button>
      <button className="tool-btn" title="Tam Ekran" onClick={onFullscreen}>⛶</button>
      <button className="tool-btn" title="Bilgi" onClick={()=>alert('Radar: RainViewer\nVeriler eğitim amaçlıdır.')}>i</button>
    </div>
  )
}

export default function MapView({ points, meta, radarLayer, radarEnabled, onToggleRadar, radarOpacity = 0.7, playing = false, renderMode = 'circles', flowSpeed = 1.0, tailLength = 80, children }) {
  const outerRef = useRef(null)
  // simple client-side animation tick (test visual)
  const [tick, setTick] = useState(0)
  const rafRef = useRef(0)
  const lastRef = useRef(0)
  useEffect(() => {
    if (!playing) return () => {}
    const loop = (ts) => {
      if (!lastRef.current) lastRef.current = ts
      const dt = (ts - lastRef.current) / 1000 // seconds
      lastRef.current = ts
      // advance tick proportional to time and flow speed (base ~10 steps per sec)
      const adv = Math.max(1, Math.floor(dt * 10 * (flowSpeed || 1)))
      setTick(t => (t + adv) % 2048)
      rafRef.current = requestAnimationFrame(loop)
    }
    rafRef.current = requestAnimationFrame(loop)
    return () => { cancelAnimationFrame(rafRef.current); rafRef.current = 0; lastRef.current = 0 }
  }, [playing, flowSpeed])
  const mapRef = useRef(null)
  const heatRef = useRef(null)
  const canvasRef = useRef(null)
  return (
    <div className="map-card" ref={outerRef}>
      <MapContainer center={CENTER} zoom={12} scrollWheelZoom className="leaflet-map" whenCreated={(m)=>{mapRef.current=m}}>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        {radarEnabled && radarLayer?.url && (
          <TileLayer url={radarLayer.url} opacity={radarOpacity} zIndex={500} />
        )}
        {renderMode==='circles' && points && points.map((pt, idx) => {
          // pulsating effect: vary radius and opacity by tick and index
          const phase = (tick + idx * 7) % 60
          const s = 0.85 + 0.25 * Math.sin((phase / 60) * Math.PI * 2)
          const radius = pt.cloudRadius * s
          const opacity = 0.25 + 0.15 * (s - 0.85) / 0.25
          // gentle drift along wind direction (test visual)
          const dir = (meta?.wind_dir_deg ?? 45) * Math.PI / 180
          const stepM = (2 + (meta?.wind_speed ?? 3) * 0.5) * flowSpeed // meters per tick
          const dy = stepM * Math.cos(dir)
          const dx = stepM * Math.sin(dir)
          const mPerDegLat = 111320
          const mPerDegLng = 111320 * Math.cos((pt.lat || 40.232) * Math.PI/180)
          const dLat = dy / mPerDegLat
          const dLng = dx / mPerDegLng
          const driftCycles = (tick % 100) // loop
          const lat = pt.lat + dLat * driftCycles
          const lng = pt.lng + dLng * driftCycles
          return (
          <Circle key={idx}
            center={[lat, lng]}
            radius={radius}
            pathOptions={{ color: pt.color, fillColor: pt.color, fillOpacity: opacity }}
          >
            <Popup>
              <div style={{minWidth: 180}}>
                <strong>Mesafe:</strong> {pt.distance_m} m<br/>
                <strong>PM2.5:</strong> {pt.pm25}<br/>
                <strong>PM10:</strong> {pt.pm10}
              </div>
            </Popup>
          </Circle>)
        })}
        {/* Heatmap mode */}
        {renderMode==='heatmap' && <HeatLayer points={points} tick={tick} meta={meta} flowSpeed={flowSpeed} />}
        <FitBounds points={points} />
        <Toolbar radarEnabled={radarEnabled} onToggleRadar={onToggleRadar} outerRef={outerRef} />
      </MapContainer>
      {renderMode==='particles' && (
        <canvas ref={canvasRef} className="particle-layer" style={{position:'absolute', inset:0, pointerEvents:'none', zIndex: 900}} />
      )}
      {renderMode==='particles' && <ParticlePainter canvasRef={canvasRef} mapRef={mapRef} points={points} tick={tick} meta={meta} flowSpeed={flowSpeed} tailLength={tailLength} />}
      {renderMode==='clouds' && (
        <canvas ref={canvasRef} className="particle-layer" style={{position:'absolute', inset:0, pointerEvents:'none', zIndex: 900}} />
      )}
      {renderMode==='clouds' && <CloudPainter canvasRef={canvasRef} mapRef={mapRef} points={points} tick={tick} meta={meta} flowSpeed={flowSpeed} />}
      {children && (
        <div className="map-overlay">
          {children}
        </div>
      )}
    </div>
  )
}

function HeatLayer({ points = [], tick, meta, flowSpeed }){
  const map = useMap()
  const layerRef = useRef(null)
  useEffect(()=>{
    if (!map) return
    let cancelled = false
    ;(async () => {
      try {
        // dynamically import plugin to avoid Vite static resolution issues
        await import('leaflet.heat')
      } catch (e) {
        console.warn('leaflet.heat yüklenemedi:', e)
      }
      if (cancelled) return
      if (layerRef.current){ map.removeLayer(layerRef.current); layerRef.current = null }
      if (!points || points.length===0) return
      // create heat points [lat, lng, intensity]
      const dir = ((meta?.wind_dir_deg ?? 45) * Math.PI) / 180
      const stepM = (2 + (meta?.wind_speed ?? 3) * 0.5) * (flowSpeed || 1)
      const cycles = (tick % 100)
      // adaptive scaling for visibility
      const vals = points.map(p=>p.pm25 || 0)
      const pMin = Math.min(...vals)
      const pMax = Math.max(...vals)
      const range = Math.max(5, pMax - pMin)
      const zoom = map.getZoom?.() ?? 12
      // use large, constant kernel so it remains visible even when zoomed in
      const radius = 180
      const blur = 95
      const heatPts = points.map((p,i)=>{
        const phase = (tick + i*7)%60
        const wobble = 0.7 + 0.3*Math.sin(phase/60*Math.PI*2) // tighten wobble range towards darker
        // adaptive intensity 0.25..1.0 based on pm25 range
        const norm = (p.pm25 - pMin) / range
        // gamma shaping + higher floor for a darker, more solid cloud
        const gammaI = Math.pow(Math.max(0, norm), 0.6)
        // fallback scaling directly from pm25 to avoid disappearing when local range is small
        const pmScale = Math.min(1, (p.pm25 || 0) / 25)
        const baseI = Math.max(gammaI, pmScale)
        const intensity = Math.min(1, Math.max(0.2, baseI * (0.9 + 0.5*wobble)))
        const mPerDegLat = 111320
        const mPerDegLng = 111320 * Math.cos((p.lat || 40.232) * Math.PI/180)
        const dLat = (stepM * Math.cos(dir)) / mPerDegLat
        const dLng = (stepM * Math.sin(dir)) / mPerDegLng
        const lat = p.lat + dLat * cycles
        const lng = p.lng + dLng * cycles
        return [lat, lng, intensity]
      })
      const heat = L.heatLayer(heatPts, {
        radius,
        blur,
        maxZoom: 22,
        max: 1.2,
        // air quality warning colors gradient
        gradient: { 
          0.0: '#2ecc71',    // Good (yeşil)
          0.25: '#f1c40f',   // Moderate (sarı)  
          0.5: '#e67e22',    // Unhealthy for Sensitive (turuncu)
          0.75: '#e74c3c',   // Unhealthy (kırmızı)
          1.0: '#8e44ad'     // Very Unhealthy (mor)
        }
      })
      layerRef.current = heat
      // ensure on-top rendering
      const paneId = 'heat-pane'
      let pane = map.getPane?.(paneId)
      if (!pane) {
        map.createPane?.(paneId)
        pane = map.getPane?.(paneId)
        if (pane) { pane.style.zIndex = 800; pane.style.opacity = '1' }
      }
      if (pane) heat.options.pane = paneId
      heat.addTo(map)
      heat.bringToFront?.()
    })()
    return ()=>{ cancelled = true; if (layerRef.current){ map.removeLayer(layerRef.current); layerRef.current=null } }
  }, [map, points, tick, flowSpeed, meta])
  return null
}

function ParticlePainter({ canvasRef, mapRef, points = [], tick, meta, flowSpeed, tailLength }){
  useEffect(() => {
    const canvas = canvasRef.current
    const map = mapRef.current
    if (!canvas || !map) return
    // resize canvas to map container
    const container = map.getContainer()
    canvas.width = container.clientWidth - 20
    canvas.height = container.clientHeight - 20
    const ctx = canvas.getContext('2d')
    // fade previous frame for trails based on tailLength (higher length => lower fade)
    const fade = Math.max(0.04, 0.22 - (tailLength||80)/1000) // ~0.18..0.04
    ctx.fillStyle = `rgba(255,255,255,${fade})`
    ctx.globalCompositeOperation = 'destination-out'
    ctx.fillRect(0,0,canvas.width, canvas.height)
    ctx.globalCompositeOperation = 'source-over'
    if (!points || points.length===0) return
    const dir = (meta?.wind_dir_deg ?? 45) * Math.PI/180
    const stepM = (2 + (meta?.wind_speed ?? 3) * 0.5) * flowSpeed
    for (let i=0;i<points.length;i++){
      const p = points[i]
      const mPerDegLat = 111320
      const mPerDegLng = 111320 * Math.cos((p.lat || 40.232) * Math.PI/180)
      const dLat = (stepM * Math.cos(dir)) / mPerDegLat
      const dLng = (stepM * Math.sin(dir)) / mPerDegLng
      const cycles = (tick % 100)
      const lat = p.lat + dLat * cycles
      const lng = p.lng + dLng * cycles
      const pt = map.latLngToContainerPoint([lat, lng])
      const alpha = Math.min(0.9, Math.max(0.2, p.pm25/100))
      ctx.fillStyle = hexToRgba(p.color || '#e67e22', alpha)
      ctx.beginPath()
      ctx.arc(pt.x, pt.y, Math.max(2, p.cloudRadius/40), 0, Math.PI*2)
      ctx.fill()
    }
  }, [canvasRef, mapRef, points, tick, meta, flowSpeed, tailLength])
  return null
}

function CloudPainter({ canvasRef, mapRef, points = [], tick, meta, flowSpeed }){
  useEffect(() => {
    const canvas = canvasRef.current
    const map = mapRef.current
    if (!canvas || !map) return
    // size canvas to map container
    const container = map.getContainer()
    canvas.width = container.clientWidth
    canvas.height = container.clientHeight
    const ctx = canvas.getContext('2d')
    // soft persistence for cloud continuity
    ctx.fillStyle = 'rgba(0,0,0,0.08)'
    ctx.globalCompositeOperation = 'destination-out'
    ctx.fillRect(0,0,canvas.width, canvas.height)
    ctx.globalCompositeOperation = 'source-over'
    if (!points || points.length===0) return
    const dir = (meta?.wind_dir_deg ?? 45) * Math.PI/180
    const stepM = (2 + (meta?.wind_speed ?? 3) * 0.5) * (flowSpeed || 1)
    const cycles = (tick % 100)
    const baseColor = '0,0,0' // dark cloud
    for (let i=0;i<points.length;i++){
      const p = points[i]
      const mPerDegLat = 111320
      const mPerDegLng = 111320 * Math.cos((p.lat || 40.232) * Math.PI/180)
      const dLat = (stepM * Math.cos(dir)) / mPerDegLat
      const dLng = (stepM * Math.sin(dir)) / mPerDegLng
      const lat = p.lat + dLat * cycles
      const lng = p.lng + dLng * cycles
      const pt = map.latLngToContainerPoint([lat, lng])
      // radius scales with cloudRadius and pm25
      const rBase = Math.max(80, (p.cloudRadius || 160))
      const r = rBase * (0.9 + 0.25*Math.sin((i*13 + tick)/28))
      const alpha = Math.min(0.95, 0.4 + (p.pm25||20)/40)
      // radial gradient (denser core, soft edge)
      const grad = ctx.createRadialGradient(pt.x, pt.y, r*0.2, pt.x, pt.y, r)
      grad.addColorStop(0.0, `rgba(${baseColor}, ${alpha})`)
      grad.addColorStop(0.45, `rgba(${baseColor}, ${Math.min(0.9, alpha*0.9)})`)
      grad.addColorStop(0.8, `rgba(${baseColor}, ${alpha*0.45})`)
      grad.addColorStop(1.0, `rgba(${baseColor}, 0)`)
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(pt.x, pt.y, r, 0, Math.PI*2)
      ctx.fill()
    }
  }, [canvasRef, mapRef, points, tick, meta, flowSpeed])
  return null
}

function hexToRgba(hex, a){
  const c = hex.replace('#','')
  const bigint = parseInt(c.length===3 ? c.split('').map(x=>x+x).join('') : c, 16)
  const r = (bigint >> 16) & 255
  const g = (bigint >> 8) & 255
  const b = bigint & 255
  return `rgba(${r}, ${g}, ${b}, ${a})`
}
