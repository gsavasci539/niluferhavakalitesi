import React, { useEffect, useState, useMemo } from 'react'
import AlertBanner from '../components/AlertBanner.jsx'
import InfoBox from '../components/InfoBox.jsx'
import PollutionCard from '../components/PollutionCard.jsx'
import MapView from '../components/MapView.jsx'
import { environmentFull, environmentBoundingBox, testApi } from '../api/client.js'
import TimeControls from '../components/TimeControls.jsx'
import { getRadarTimeline, frameToTileUrl, getRadarTimelineDetailed } from '../api/radar.js'

function colorScale(pm25) {
  if (pm25 < 12) return '#2ecc71'
  if (pm25 < 35.5) return '#f1c40f'
  if (pm25 < 55.5) return '#e67e22'
  if (pm25 < 150.5) return '#e74c3c'
  return '#8e44ad'
}

function degToCompass(deg) {
  const dirs = ['K','KKD','KD','DKD','D','DGD','GD','GGD','G','GGB','GB','BGB','B','BKB','KB','KKB']
  const d = ((deg % 360) + 360) % 360
  const idx = Math.round(d / 22.5) % 16
  return dirs[idx]
}

const NILUFER_BOUNDING_BOX = {
  lat_min: 40.170,
  lat_max: 40.260,
  lon_min: 28.900,
  lon_max: 29.050
}

export default function Dashboard() {
  const [params, setParams] = useState({
    wind_speed: 3,
    wind_dir_deg: 45,
    base_pm25: 22,
    base_pm10: 35,
    base_no2: 18,
    base_so2: 6,
    base_co: 0.7,
    num_rays: 9,
    max_distance_m: 5000,
    step_m: 500,
  })
  const [env, setEnv] = useState(null)
  const [boundingBoxData, setBoundingBoxData] = useState(null)
  const [data, setData] = useState({ meta: null, points: [] })
  const [loading, setLoading] = useState(false)
  // time playback state
  const [frames, setFrames] = useState([]) // array of {meta, points}
  const [frameIndex, setFrameIndex] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(400) // ms per frame
  // radar timeline
  const [radarLayers, setRadarLayers] = useState([]) // array of {url, opacity}
  const [uiIndexRadar, setUiIndexRadar] = useState(0)
  const [uiIndexDisp, setUiIndexDisp] = useState(0)
  const [radarEnabled, setRadarEnabled] = useState(false)
  const [radarOpacity, setRadarOpacity] = useState(0.25)
  const [radarTimes, setRadarTimes] = useState([])
  const [radarHost, setRadarHost] = useState('')
  const [radarMode, setRadarMode] = useState('current') // 'past' | 'current' | 'forecast'
  const [radarPast, setRadarPast] = useState([])
  const [radarNowcast, setRadarNowcast] = useState([])
  // visual test tick (100ms) – bağlı oynatma durumuna
  const [uiTick, setUiTick] = useState(0)
  const [presetMinutes, setPresetMinutes] = useState(60)
  const [playingRadar, setPlayingRadar] = useState(false)
  const [playingDispersion, setPlayingDispersion] = useState(true)
  const [speedRadar, setSpeedRadar] = useState(400)
  const [speedDispersion, setSpeedDispersion] = useState(400)
  const [flowSpeed, setFlowSpeed] = useState(0.6)
  const [renderMode, setRenderMode] = useState('clouds')
  useEffect(()=>{
    const id = setInterval(()=> setUiTick(t => (t+1)%2048), 250)
    return ()=> clearInterval(id)
  }, [])

  const summary = useMemo(() => {
    if (!env) return { pm25: 0, pm10: 0, no2: 0, so2: 0, co: 0, color: '#2ecc71' }
    const aq = env.current?.air_quality || {}
    return {
      pm25: aq.pm2_5 ?? 0,
      pm10: aq.pm10 ?? 0,
      no2: aq.no2 ?? 0,
      so2: aq.so2 ?? 0,
      co: aq.co ?? 0,
      color: colorScale(aq.pm2_5 ?? 0),
    }
  }, [env])

  const hourly = useMemo(() => {
    const h = env?.hourly || {}
    return {
      time: h.time || [],
      pm2_5: h.pm2_5 || [],
      pm10: h.pm10 || [],
      no2: h.no2 || [],
      so2: h.so2 || [],
      co: h.co || [],
      wind_speed: h.wind_speed || [],
      wind_direction: h.wind_direction || [],
    }
  }, [env])

  const hourlyTotal = hourly.time.length

  const selectedIndex = useMemo(() => {
    if (!hourlyTotal) return 0
    return Math.max(0, Math.min(uiIndexDisp, hourlyTotal - 1))
  }, [uiIndexDisp, hourlyTotal])

  const selectedHourly = useMemo(() => {
    if (!hourlyTotal) {
      return {
        time: null,
        air_quality: { pm2_5: null, pm10: null, no2: null, so2: null, co: null },
        wind: { speed: null, direction: null },
      }
    }
    return {
      time: hourly.time[selectedIndex] ?? null,
      air_quality: {
        pm2_5: hourly.pm2_5[selectedIndex] ?? null,
        pm10: hourly.pm10[selectedIndex] ?? null,
        no2: hourly.no2[selectedIndex] ?? null,
        so2: hourly.so2[selectedIndex] ?? null,
        co: hourly.co[selectedIndex] ?? null,
      },
      wind: {
        speed: hourly.wind_speed[selectedIndex] ?? null,
        direction: hourly.wind_direction[selectedIndex] ?? null,
      },
    }
  }, [hourly, selectedIndex, hourlyTotal])

  const pastIndex = useMemo(() => {
    if (!hourlyTotal) return 0
    const pastCount = 7 * 24
    return Math.min(pastCount - 1, hourlyTotal - 1)
  }, [hourlyTotal])

  const forecastIndex = useMemo(() => {
    if (!hourlyTotal) return 0
    return hourlyTotal - 1
  }, [hourlyTotal])

  const currentSummary = useMemo(() => {
    const aq = env?.current?.air_quality || {}
    return {
      pm25: aq.pm2_5 ?? 0,
      pm10: aq.pm10 ?? 0,
      no2: aq.no2 ?? null,
      so2: aq.so2 ?? null,
      co: aq.co ?? null,
      color: colorScale(aq.pm2_5 ?? 0),
    }
  }, [env])

  const currentMeta = useMemo(() => {
    const w = env?.current?.wind || {}
    return {
      wind_speed: w.speed ?? 0,
      wind_dir_deg: w.direction ?? 0,
      wind_dir_compass: degToCompass(w.direction ?? 0),
    }
  }, [env])

  const selectedPm = useMemo(() => {
    const aq = selectedHourly.air_quality
    return {
      pm25: aq.pm2_5 ?? 0,
      pm10: aq.pm10 ?? 0,
      color: colorScale(aq.pm2_5 ?? 0),
    }
  }, [selectedHourly])

  const animatedSummary = useMemo(() => summary, [summary])

  const animatedMeta = useMemo(() => {
    if (!env) return data?.meta || { wind_speed: 0, wind_dir_deg: 0, wind_dir_compass: '-' }
    const w = env.current?.wind || {}
    return {
      wind_speed: w.speed ?? 0,
      wind_dir_deg: w.direction ?? 0,
      wind_dir_compass: degToCompass(w.direction ?? 0),
    }
  }, [env, data?.meta])

  const mapMeta = useMemo(() => {
    const dir = selectedHourly.wind.direction
    const spd = selectedHourly.wind.speed
    if (dir == null || spd == null) return data?.meta
    return {
      wind_speed: spd,
      wind_dir_deg: dir,
      wind_dir_compass: degToCompass(dir),
    }
  }, [selectedHourly, data?.meta])

  const mapPoints = useMemo(() => {
    console.log('Bounding box data:', boundingBoxData)
    console.log('Bounding box points count:', boundingBoxData?.points?.length)
    
    // Use bounding box data if available, otherwise fall back to single point
    if (boundingBoxData && boundingBoxData.points && boundingBoxData.points.length > 0) {
      console.log('Using bounding box points for map')
      return boundingBoxData.points.map(point => ({
        lat: point.lat,
        lng: point.lon,
        pm25: point.air_quality.pm2_5,
        pm10: point.air_quality.pm10,
        no2: point.air_quality.no2,
        so2: point.air_quality.so2,
        co: point.air_quality.co,
        distance_m: 0,
        cloudRadius: 220,
        color: point.air_quality.pm2_5 == null ? '#000000' : colorScale(point.air_quality.pm2_5),
      }))
    }
    
    console.log('Using fallback single point')
    // Fallback to single point from env
    const src = env?.location
    if (!src) return []
    return [
      {
        lat: src.lat,
        lng: src.lon,
        pm25: selectedHourly.air_quality.pm2_5,
        pm10: selectedHourly.air_quality.pm10,
        no2: selectedHourly.air_quality.no2,
        so2: selectedHourly.air_quality.so2,
        co: selectedHourly.air_quality.co,
        distance_m: 0,
        cloudRadius: 220,
        color: selectedHourly.air_quality.pm2_5 == null ? '#000000' : colorScale(selectedHourly.air_quality.pm2_5),
      },
    ]
  }, [env?.location, selectedHourly, boundingBoxData])

  const baseValues = useMemo(() => ({
    pm25: params.base_pm25,
    pm10: params.base_pm10,
    no2: params.base_no2,
    so2: params.base_so2,
    co: params.base_co,
    color: colorScale(params.base_pm25),
  }), [params])

  async function load() {
    console.log('=== LOAD FUNCTION STARTED ===')
    setLoading(true)
    try {
      console.log('Loading environment full data...')
      const full = await environmentFull()
      console.log('Environment full data loaded:', full)
      setEnv(full)

      // Load bounding box data
      try {
        console.log('Attempting to load bounding box data...')
        
        // First test the API connection
        try {
          const testResult = await testApi()
          console.log('API test successful:', testResult)
        } catch (testError) {
          console.error('API test failed:', testError)
        }
        
        console.log('Making bounding box API call...')
        const bboxData = await environmentBoundingBox()
        console.log('Bounding box data loaded:', bboxData)
        setBoundingBoxData(bboxData)
      } catch (bboxError) {
        console.warn('Bounding box data could not be loaded:', bboxError)
        // Continue without bounding box data
      }

      const src = full.location
      // /environment/full contract does not include spread, so we only show the source point on map
      const points = [
        {
          lat: src.lat,
          lng: src.lon,
          pm25: full.current?.air_quality?.pm2_5,
          pm10: full.current?.air_quality?.pm10,
          no2: full.current?.air_quality?.no2,
          so2: full.current?.air_quality?.so2,
          co: full.current?.air_quality?.co,
          distance_m: 0,
          cloudRadius: 220,
          color: '#000000',
        },
      ]

      setData({
        meta: {
          wind_speed: full.current?.wind?.speed,
          wind_dir_deg: full.current?.wind?.direction,
          wind_dir_compass: degToCompass(full.current?.wind?.direction ?? 0),
        },
        points,
      })

      // hourly time index defaults to the last (most recent / near-now)
      if ((full.hourly?.time || []).length) {
        setUiIndexDisp((full.hourly.time.length || 1) - 1)
      }
    } catch (e) {
      console.error('Simulate error', e)
      alert('Veriler alınamadı. Backend çalışıyor mu?')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // load radar frames once
  useEffect(() => {
    (async () => {
      try {
        const det = await getRadarTimelineDetailed()
        setRadarHost(det.host)
        setRadarPast(det.past)
        setRadarNowcast(det.nowcast)
        // default combine
        const combined = [...det.past, ...det.nowcast]
        setRadarLayers(combined.map(f => frameToTileUrl(det.host, f, { opacity: 0.7 })))
        setRadarTimes(combined.map(f => f.time))
        setUiIndexRadar(0)
      } catch (e) {
        console.warn('Radar timeline yüklenemedi:', e?.message || e)
      }
    })()
  }, [])

  useEffect(() => {
    // rebuild list by mode
    let list = []
    if (radarMode === 'past') list = radarPast
    else if (radarMode === 'forecast') list = radarNowcast
    else list = [...radarPast, ...radarNowcast]
    if (!radarHost || list.length === 0) return
    setRadarLayers(list.map(f => frameToTileUrl(radarHost, f, { opacity: radarOpacity })))
    setRadarTimes(list.map(f => f.time))
    // güncel modunda son frame'e atla ve duraklat
    if (radarMode === 'current') {
      setUiIndexRadar(list.length - 1)
      setPlayingRadar(false)
    } else {
      setUiIndexRadar(0)
    }
  }, [radarMode, radarPast, radarNowcast, radarHost])

  // Generate a small sequence by sweeping wind_dir over time to mimic radar-like motion
  async function generateFrames() {
    try {
      alert('Zaman çizelgesi özelliği bu modda devre dışı.')
    } catch (e) {
      console.error('Frame generation error', e)
      alert('Çerçeveler oluşturulamadı. Backend çalışıyor mu?')
    }
  }

  // playback effect
  // Radar playback loop
  useEffect(() => {
    if (!playingRadar) return
    const total = radarLayers.length
    if (total === 0) return
    const id = setInterval(() => {
      setUiIndexRadar(i => (i + 1) % total)
    }, speedRadar)
    return () => clearInterval(id)
  }, [playingRadar, radarLayers.length, speedRadar])

  // Dispersion playback loop
  useEffect(() => {
    if (!playingDispersion) return
    const total = hourlyTotal
    if (total === 0) return
    const id = setInterval(() => {
      setUiIndexDisp(i => (i + 1) % total)
      setFrameIndex(i => (i + 1) % total)
    }, speedDispersion)
    return () => clearInterval(id)
  }, [playingDispersion, hourlyTotal, speedDispersion])

  return (
    <div className="dashboard-grid">
      <div className="left">
        <AlertBanner pm25={currentSummary.pm25} />
        <InfoBox />


        <PollutionCard
          meta={currentMeta}
          baseValues={currentSummary}
          onUpdate={load}
          loading={loading}
        />


        <div className={`card ${selectedIndex < pastIndex ? 'selected' : ''}`} onClick={() => setUiIndexDisp(pastIndex)} style={{cursor: 'pointer'}}>
          <div className="card-header">
            <h3>Geçmiş 7 Gün (Saatlik)</h3>
          </div>
          <div className="card-body">
            <div className="grid two">
              <div className="metric">
                <span className="label">Zaman</span>
                <span className="value">{selectedHourly.time || '-'}</span>
              </div>
              <div className="metric">
                <span className="label">PM2.5</span>
                <span className="value colored" style={{color: selectedPm.color}}>{selectedPm.pm25}</span>
              </div>
              <div className="metric">
                <span className="label">PM10</span>
                <span className="value">{selectedPm.pm10}</span>
              </div>
              <div className="metric">
                <span className="label">Rüzgâr Hızı</span>
                <span className="value">{mapMeta?.wind_speed ?? '-'} m/s</span>
              </div>
              <div className="metric">
                <span className="label">Rüzgâr Yönü</span>
                <span className="value">{mapMeta?.wind_dir_deg != null ? `${mapMeta.wind_dir_deg}° ${mapMeta.wind_dir_compass}` : '-'}</span>
              </div>
            </div>
          </div>
        </div>

        <div className={`card ${selectedIndex >= pastIndex ? 'selected' : ''}`} onClick={() => setUiIndexDisp(hourlyTotal - 1)} style={{cursor: 'pointer'}}>
          <div className="card-header">
            <h3>3 Gün Tahmin (Saatlik)</h3>
          </div>
          <div className="card-body">
            <div className="grid two">
              <div className="metric">
                <span className="label">Zaman</span>
                <span className="value">{selectedHourly.time || '-'}</span>
              </div>
              <div className="metric">
                <span className="label">PM2.5</span>
                <span className="value colored" style={{color: selectedPm.color}}>{selectedPm.pm25}</span>
              </div>
              <div className="metric">
                <span className="label">PM10</span>
                <span className="value">{selectedPm.pm10}</span>
              </div>
              <div className="metric">
                <span className="label">Rüzgâr Hızı</span>
                <span className="value">{mapMeta?.wind_speed ?? '-'} m/s</span>
              </div>
              <div className="metric">
                <span className="label">Rüzgâr Yönü</span>
                <span className="value">{mapMeta?.wind_dir_deg != null ? `${mapMeta.wind_dir_deg}° ${mapMeta.wind_dir_compass}` : '-'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="right">
        <MapView
          points={mapPoints}
          meta={mapMeta}
          radarLayer={radarLayers.length ? radarLayers[uiIndexRadar % radarLayers.length] : null}
          radarEnabled={radarEnabled}
          onToggleRadar={() => setRadarEnabled(v => !v)}
          radarOpacity={radarOpacity}
          playing={playingDispersion}
          renderMode={renderMode}
          flowSpeed={flowSpeed}
          tailLength={140}
        >
          {/* Dispersion controls */}
          <TimeControls
            frameIndex={uiIndexDisp}
            total={hourlyTotal}
            playing={playingDispersion}
            speed={speedDispersion}
            onPlayToggle={() => setPlayingDispersion(p => !p)}
            onSeek={(v) => { setUiIndexDisp(v); setPlayingDispersion(false) }}
            onSpeedChange={(v) => setSpeedDispersion(v)}
            flowSpeed={flowSpeed}
            onFlowChange={setFlowSpeed}
            renderMode={renderMode}
            onRenderMode={setRenderMode}
            controlTarget={'dispersion'}
            label={hourlyTotal ? `${selectedIndex + 1} / ${hourlyTotal} • ${selectedHourly.time || ''}` : '—'}
            activeMode={'current'}
            onModeChange={(mode) => {
              if (mode === 'current') {
                setUiIndexDisp(hourlyTotal - 1);
                setPlayingDispersion(true);
              }
            }}
          />
        </MapView>
        <div className="card" style={{marginTop: 10}}>
          <div className="card-body" style={{display:'flex', gap:10}}>
            <button className="btn" onClick={generateFrames} disabled={loading}>Zaman Çizelgesi Oluştur</button>
            <button className="btn" onClick={()=>{setFrames([]); setFrameIndex(0); setPlaying(false)}}>Zaman Modunu Kapat</button>
          </div>
        </div>
      </div>
    </div>
  )
}
