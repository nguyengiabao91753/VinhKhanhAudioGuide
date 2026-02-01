import React from 'react';
import type { PoiDto } from '../entities/PoiDto';

interface Props {
  poi: PoiDto | null;
  distance: number | null;
  isPlaying: boolean;
  isPaused: boolean;
  currentLanguage: string;
  onPlay: () => void;
  onPause: () => void;
  onResume: () => void;
  onCollapse: ()=>void;
}

export default function PoiInfoPanel({ poi, distance, isPlaying, isPaused, currentLanguage, onPlay, onPause, onResume }: Props) {
  if (!poi) {
    return <div style={{padding:12}}>No active POI. Move closer to a point to start narration.</div>;
  }

  const ld = poi.localizedData.find(l => l.langCode === currentLanguage) || poi.localizedData[0];

  return (
    <div style={{display:'flex', gap:12, alignItems:'center'}}>
      <img src={poi.thumbnail} alt={ld?.name} style={{width:72,height:72, borderRadius:8, objectFit:'cover'}}/>
      <div style={{flex:1}}>
        <div style={{fontWeight:700}}>{ld?.name}</div>
        <div style={{fontSize:13, color:'gray'}}>{ld?.descriptionText}</div>
        <div style={{fontSize:12, color:'#6b7280'}}>{distance != null ? `${Math.round(distance)} m` : ''}</div>
      </div>
      <div>
        {!isPlaying && <button onClick={onPlay} style={{padding:'8px 12px', borderRadius:8}}>Play</button>}
        {isPlaying && <button onClick={onPause} style={{padding:'8px 12px', borderRadius:8}}>Pause</button>}
      </div>
    </div>
  );
}
