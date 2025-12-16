import React from 'react'

export default function TimeControls({
  frameIndex,
  total,
  playing,
  speed,
  onPlayToggle,
  onSeek,
  onSpeedChange,
  onPreset,
  label,
  radarOpacity,
  onOpacityChange,
  onModeChange,
  activeMode,
  presetMinutes,
  flowSpeed,
  onFlowChange,
  renderMode,
  onRenderMode,
  controlTarget,
  onControlTarget,
  tailLength,
  onTailChange,
}) {
  return (
    <div className="timeline-overlay">
      <div className="chip-row">
        <button className={`chip ${presetMinutes===30?'active':''}`} onClick={()=>onPreset?.(30)}>30 dk.</button>
        <button className={`chip ${presetMinutes===60?'active':''}`} onClick={()=>onPreset?.(60)}>60 dk.</button>
        <button className={`chip ${activeMode==='past'?'active':''}`} onClick={()=>onModeChange?.('past')}>-24 Saat</button>
        <button className={`chip ${activeMode==='current'?'active':''}`} onClick={()=>onModeChange?.('current')}>güncel</button>
        <button className={`chip ${activeMode==='forecast'?'active':''}`} onClick={()=>onModeChange?.('forecast')}>yarın</button>
      </div>
      <div className="chip-row" style={{marginTop:4}}>
        <span className="op-label" style={{marginRight:6}}>Görünüm</span>
        <button className={`chip ${renderMode==='circles'?'active':''}`} onClick={()=>onRenderMode?.('circles')}>Daireler</button>
        <button className={`chip ${renderMode==='heatmap'?'active':''}`} onClick={()=>onRenderMode?.('heatmap')}>Heatmap</button>
        <button className={`chip ${renderMode==='particles'?'active':''}`} onClick={()=>onRenderMode?.('particles')}>Parçacık</button>
        <span className="op-label" style={{marginLeft:10, marginRight:6}}>Kontrol</span>
        <button className={`chip ${controlTarget==='radar'?'active':''}`} onClick={()=>onControlTarget?.('radar')}>Radar</button>
        <button className={`chip ${controlTarget==='dispersion'?'active':''}`} onClick={()=>onControlTarget?.('dispersion')}>Yayılım</button>
      </div>
      <div className="timeline-core">
        <span className="timebox">{label || (total>0? `${frameIndex+1}/${total}`:'—')}</span>
        <input
          className="timeline-range"
          type="range"
          min={0}
          max={Math.max(0, total - 1)}
          value={Math.min(frameIndex, Math.max(0, total - 1))}
          onChange={(e) => onSeek(Number(e.target.value))}
        />
        <button className={`play-btn ${playing? 'active':''}`} onClick={onPlayToggle} aria-label={playing ? 'Duraklat' : 'Oynat'}>
          {playing ? '❚❚' : '►'}
        </button>
        <select className="timeline-speed" value={speed} onChange={(e)=> onSpeedChange(Number(e.target.value))}>
          <option value={800}>0.5x</option>
          <option value={400}>1x</option>
          <option value={200}>2x</option>
        </select>
        {typeof radarOpacity === 'number' && (
          <div className="opacity-group">
            <span className="op-label">Radar</span>
            <input type="range" min={0} max={1} step={0.05} value={radarOpacity} onChange={(e)=> onOpacityChange?.(Number(e.target.value))} />
          </div>
        )}
        {typeof flowSpeed === 'number' && (
          <div className="opacity-group" style={{marginLeft:8}}>
            <span className="op-label">Akış Hızı</span>
            <input type="range" min={0.3} max={2} step={0.1} value={flowSpeed} onChange={(e)=> onFlowChange?.(Number(e.target.value))} />
            <span className="timebox" style={{minWidth:48,textAlign:'center'}}>{flowSpeed.toFixed(1)}x</span>
          </div>
        )}
        {renderMode==='particles' && typeof tailLength === 'number' && (
          <div className="opacity-group" style={{marginLeft:8}}>
            <span className="op-label">İz Uzunluğu</span>
            <input type="range" min={10} max={200} step={10} value={tailLength} onChange={(e)=> onTailChange?.(Number(e.target.value))} />
            <span className="timebox" style={{minWidth:48,textAlign:'center'}}>{tailLength}</span>
          </div>
        )}
      </div>
    </div>
  )
}
