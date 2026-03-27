/**
 * NarrationBanner v4
 *
 * auto   — compact strip triggered by geofence
 * manual — full panel with:
 *   • Language picker (shows all available langCodes from POI.localizedData)
 *   • Full descriptionText displayed in selected language
 *   • Replay button respects selected language
 *   • Stays open after audio ends
 */
import { useEffect, useState, useRef, useCallback } from 'react';
import { AudioTierEngine, type AudioTierState } from '../features/audio/lib/AudioTierEngine';
import { t } from '../shared/i18n';
import type { PoiDto } from '../entities/poi';
import { Play, Pause, RotateCcw, X, Volume2, MapPin, Navigation, Globe } from 'lucide-react';

export type BannerMode = 'auto' | 'manual';

// ── Language display metadata ─────────────────────────────────────────────
const LANG_META: Record<string, { flag: string; label: string }> = {
  vi:  { flag: '🇻🇳', label: 'Tiếng Việt' },
  en:  { flag: '🇬🇧', label: 'English'    },
  fr:  { flag: '🇫🇷', label: 'Français'   },
  es:  { flag: '🇪🇸', label: 'Español'    },
  de:  { flag: '🇩🇪', label: 'Deutsch'    },
  it:  { flag: '🇮🇹', label: 'Italiano'   },
  ja:  { flag: '🇯🇵', label: '日本語'      },
  ko:  { flag: '🇰🇷', label: '한국어'      },
  zh:  { flag: '🇨🇳', label: '中文'        },
  pt:  { flag: '🇵🇹', label: 'Português'  },
  ru:  { flag: '🇷🇺', label: 'Русский'    },
  th:  { flag: '🇹🇭', label: 'ภาษาไทย'    },
  ar:  { flag: '🇸🇦', label: 'العربية'    },
};
const langMeta = (code: string) =>
  LANG_META[code] ?? { flag: '🌐', label: code.toUpperCase() };

interface Props {
  poi: PoiDto | null;
  mode: BannerMode;
  language: string;
  userLocation?: { lat: number; lng: number } | null;
  /** External progress 0–1 (from App — tracks both HTMLAudio and SpeechSynthesis) */
  narrationProgress?: number;
  narrationIsPlaying?: boolean;
  narrationIsPaused?: boolean;
  isGenerating?: boolean;
  onClose: () => void;
  onTogglePause?: () => void;
  /** Called when user taps Replay or changes language — passes selected lang */
  onReplay: (poi: PoiDto, lang: string) => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────
function haversine(la1:number,ln1:number,la2:number,ln2:number){
  const R=6371000,d=Math.PI/180;
  const dLa=(la2-la1)*d,dLn=(ln2-ln1)*d;
  const a=Math.sin(dLa/2)**2+Math.cos(la1*d)*Math.cos(la2*d)*Math.sin(dLn/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}
function fmtDist(m:number){return m<1000?`${Math.round(m)} m`:`${(m/1000).toFixed(1)} km`;}

let cssInj=false;
function injectCSS(){
  if(cssInj)return;cssInj=true;
  const s=document.createElement('style');
  s.textContent=`
    @keyframes eq-b{0%,100%{transform:scaleY(.35)}50%{transform:scaleY(1)}}
    @keyframes bnr-up{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}
    .bnr-slide{animation:bnr-up .28s cubic-bezier(.34,1.56,.64,1) both}
    .lang-pill{
      display:flex;align-items:center;gap:4px;padding:5px 10px;
      border-radius:99px;border:1.5px solid transparent;
      cursor:pointer;font-size:12px;font-weight:600;
      transition:all .15s;white-space:nowrap;
    }
    .lang-pill.active{background:#10b981;color:#fff;border-color:#10b981;}
    .lang-pill:not(.active){background:#f0fdf4;color:#065f46;border-color:#bbf7d0;}
    .lang-pill:not(.active):hover{background:#dcfce7;}
  `;
  document.head.appendChild(s);
}

function EqBar({active}:{active:boolean}){
  if(!active)return null;
  return(
    <span style={{display:'flex',gap:2,alignItems:'flex-end',height:18}}>
      {[5,10,7,14,8,12,6].map((h,i)=>(
        <span key={i} style={{width:3,height:h,background:'#10b981',borderRadius:99,
          animation:`eq-b .6s ease-in-out infinite`,animationDelay:`${i*.07}s`}}/>
      ))}
    </span>
  );
}

function Ring({progress,size=52,stroke=3}:{progress:number;size?:number;stroke?:number}){
  const r=(size-stroke*2)/2,circ=2*Math.PI*r;
  return(
    <svg width={size} height={size} style={{position:'absolute',top:0,left:0,transform:'rotate(-90deg)'}}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(0,0,0,.08)" strokeWidth={stroke}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#10b981" strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={circ*(1-Math.min(progress,1))}
        strokeLinecap="round" style={{transition:'stroke-dashoffset .4s linear'}}/>
    </svg>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────
export default function NarrationBanner({
  poi,
  mode,
  language,
  userLocation,
  narrationProgress:extProgress,
  narrationIsPlaying,
  narrationIsPaused,
  isGenerating,
  onClose,
  onTogglePause,
  onReplay,
}:Props){
  injectCSS();

  const [as,setAs]               = useState<AudioTierState|null>(null);
  // manualOpen: true while user has this banner open in manual mode.
  // Reset when poi changes (new POI) or when user explicitly closes.
  const [manualOpen, setManualOpen]       = useState(false);
  const [selectedLang,setSelectedLang]   = useState<string>(language);
  const lastPoiIdRef                      = useRef<string|null>(null);
  const eng                              = useRef(AudioTierEngine.getInstance());

  useEffect(()=>{const u=eng.current.subscribe(setAs);return u;},[]);

  // When a new POI arrives → open banner and reset lang
  useEffect(()=>{
    if(poi && poi.id !== lastPoiIdRef.current){
      lastPoiIdRef.current = poi.id;
      setManualOpen(true);
      setSelectedLang(language);
    }
  },[poi, language]);

  // When same POI is re-set (e.g. after close + re-click) → re-open
  useEffect(()=>{
    if(poi){
      setManualOpen(true);
      setSelectedLang(prev => prev || language);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[poi]);

  // Use external progress (more reliable — tracks both HTMLAudio and Web Speech)
  const isPlay  = narrationIsPlaying ?? as?.isPlaying ?? false;
  const isPause = narrationIsPaused ?? as?.isPaused ?? false;
  const prog    = extProgress ?? as?.progress ?? 0;
  const ended   = !isPlay&&!isPause&&prog>0.01;
  const dist    = (userLocation&&poi)
    ? haversine(userLocation.lat,userLocation.lng,poi.position.lat,poi.position.lng) : null;

  // Available languages from the POI's localizedData
  const availableLangs = poi?.localizedData?.map(l=>l.langCode) ?? [language];

  // Currently selected localized entry
  const selectedLD = poi?.localizedData?.find(l=>l.langCode===selectedLang)
    ?? poi?.localizedData?.[0];

  const handleLangSelect = useCallback((lang:string)=>{
    setSelectedLang(lang);
    if(poi) onReplay(poi, lang); // auto-replay in selected language
  },[poi,onReplay]);

  const handleReplayClick = useCallback(()=>{
    if(poi) onReplay(poi, selectedLang);
  },[poi,selectedLang,onReplay]);

  const handlePauseResume = useCallback(()=>{
    if(onTogglePause){ onTogglePause(); return; }
    if(isPause) eng.current.resume();
    else eng.current.pause();
  },[isPause,onTogglePause]);

  const close = useCallback(()=>{
    eng.current.stop();
    setManualOpen(false);
    lastPoiIdRef.current = null;
    onClose();
  },[onClose]);

  // Show when: poi exists AND (manual mode is open OR auto mode has active poi)
  const shouldShow = !!poi && (mode === 'manual' ? manualOpen : true);
  if(!shouldShow) return null;

  // ── AUTO mode — compact strip ─────────────────────────────────────────
  if(mode==='auto'){
    return(
      <div className="bnr-slide" style={{
        background:'#fff',borderTop:'1px solid #f0f0f0',
        boxShadow:'0 -4px 20px rgba(0,0,0,.09)',zIndex:2000,position:'relative',
      }}>
        <div style={{position:'absolute',top:0,left:0,height:2,background:'#10b981',
          borderRadius:1,width:`${prog*100}%`,transition:'width .3s linear'}}/>
        <div style={{display:'flex',alignItems:'center',gap:12,padding:'10px 14px'}}>
          <div style={{position:'relative',width:46,height:46,borderRadius:11,
            overflow:'hidden',background:'#ecfdf5',flexShrink:0}}>
            {poi.banner || poi.thumbnail
              ?<img src={poi.banner || poi.thumbnail} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
              :<div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',
                justifyContent:'center'}}><Volume2 size={20} color="#10b981"/></div>
            }
          </div>
          <div style={{flex:1,minWidth:0}}>
            <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:2}}>
              <EqBar active={isPlay}/>
              <p style={{margin:0,fontWeight:700,fontSize:13,color:'#111',
                overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
                {(poi.localizedData?.find(l=>l.langCode===language)?.name || poi.localizedData?.[0]?.name || '')}
              </p>
            </div>
            <p style={{margin:0,fontSize:11,color:'#6b7280'}}>
              {isPause?t(language,'banner.paused'):isPlay?t(language,'banner.playing'):t(language,'banner.finished')}
              {dist!==null&&<span style={{marginLeft:6}}>· {fmtDist(dist)}</span>}
            </p>
          </div>
          <div style={{display:'flex',gap:6,flexShrink:0}}>
            <button onClick={handlePauseResume}
              style={{width:34,height:34,borderRadius:'50%',background:'#ecfdf5',
                border:'none',cursor:'pointer',display:'flex',alignItems:'center',
                justifyContent:'center',color:'#059669'}}>
              {isPause?<Play size={15}/>:<Pause size={15}/>}
            </button>
            <button onClick={handleReplayClick}
              style={{width:34,height:34,borderRadius:'50%',background:'#eff6ff',
                border:'none',cursor:'pointer',display:'flex',alignItems:'center',
                justifyContent:'center',color:'#2563eb'}}>
              <RotateCcw size={14}/>
            </button>
            <button onClick={close}
              style={{width:34,height:34,borderRadius:'50%',background:'#f3f4f6',
                border:'none',cursor:'pointer',display:'flex',alignItems:'center',
                justifyContent:'center',color:'#6b7280'}}>
              <X size={14}/>
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── MANUAL mode — full panel ──────────────────────────────────────────
  return(
    <div className="bnr-slide" style={{
      background:'#fff',borderTop:'1px solid #f0f0f0',
      boxShadow:'0 -8px 40px rgba(0,0,0,.14)',zIndex:2000,
      position:'relative',display:'flex',flexDirection:'column',
      maxHeight:'80vh',overflow:'hidden',
    }}>
      {/* Hero image */}
      <div style={{position:'relative',flexShrink:0}}>
        {poi.banner || poi.thumbnail?(
          <img src={poi.banner || poi.thumbnail} alt={selectedLD?.name||(poi.localizedData?.find(l=>l.langCode===language)?.name || poi.localizedData?.[0]?.name || '')}
            style={{width:'100%',height:150,objectFit:'cover',display:'block'}}/>
        ):(
          <div style={{height:90,background:'linear-gradient(135deg,#ecfdf5,#d1fae5)',
            display:'flex',alignItems:'center',justifyContent:'center'}}>
            <MapPin size={38} color="#10b981"/>
          </div>
        )}
        {/* Gradient overlay */}
        <div style={{position:'absolute',inset:0,
          background:'linear-gradient(to top,rgba(0,0,0,.65) 0%,rgba(0,0,0,.05) 50%,transparent 100%)'}}/>
        {/* Title + status on image */}
        <div style={{position:'absolute',bottom:10,left:14,right:46}}>
          <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}>
            {isGenerating
              ? <span style={{fontSize:12,color:'#fcd34d',fontWeight:700,animation:'pulse 1s infinite'}}>{t(language,'banner.generating')}</span>
              : <EqBar active={isPlay} />
            }
            {ended&&!isGenerating&&<span style={{fontSize:11,color:'#a7f3d0',fontWeight:700}}>✓ Đã phát xong</span>}
          </div>
          <p style={{color:'#fff',fontWeight:800,fontSize:16,margin:0,lineHeight:1.25,
            textShadow:'0 1px 6px rgba(0,0,0,.6)'}}>
            {selectedLD?.name||(poi.localizedData?.find(l=>l.langCode===language)?.name || poi.localizedData?.[0]?.name || '')}
          </p>
          {dist!==null&&(
            <div style={{display:'flex',alignItems:'center',gap:4,marginTop:4}}>
              <Navigation size={11} color="#86efac"/>
              <span style={{fontSize:11,color:'#86efac',fontWeight:600}}>
                {fmtDist(dist)} {t(language,'banner.from_you')}
              </span>
            </div>
          )}
        </div>
        <button onClick={close} style={{
          position:'absolute',top:10,right:10,width:32,height:32,
          borderRadius:'50%',background:'rgba(0,0,0,.45)',border:'none',
          color:'#fff',cursor:'pointer',display:'flex',alignItems:'center',
          justifyContent:'center',backdropFilter:'blur(4px)'}}>
          <X size={15}/>
        </button>
      </div>

      {/* ── Language selector ── */}
      {availableLangs.length > 1 && (
        <div style={{
          borderBottom:'1px solid #f0fdf4',
          padding:'10px 14px 8px',
          flexShrink:0,
        }}>
          <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:7}}>
            <Globe size={13} color="#10b981"/>
            <span style={{fontSize:11,fontWeight:700,color:'#6b7280',
              textTransform:'uppercase',letterSpacing:.8}}>
              {t(language,'banner.lang_label')}
            </span>
          </div>
          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
            {availableLangs.map(lang=>{
              const meta = langMeta(lang);
              return(
                <button
                  key={lang}
                  className={`lang-pill ${selectedLang===lang?'active':''}`}
                  onClick={()=>handleLangSelect(lang)}
                >
                  <span style={{fontSize:14}}>{meta.flag}</span>
                  {meta.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Description text in selected language ── */}
      <div style={{padding:'10px 16px 4px',overflowY:'auto',flex:1}}>
        {selectedLD?.descriptionText || selectedLD?.description ? (
          <p style={{fontSize:13.5,color:'#374151',lineHeight:1.7,margin:0}}>
            {selectedLD.descriptionText || selectedLD.description}
          </p>
        ) : (
          <p style={{fontSize:13,color:'#9ca3af',fontStyle:'italic',margin:0}}>
            {poi.localizedData?.find(l=>l.langCode===language)?.descriptionText || poi.localizedData?.[0]?.descriptionText || ''}
          </p>
        )}
      </div>

      {/* ── Audio controls ── */}
      <div style={{
        padding:'10px 14px 16px',borderTop:'1px solid #f3f4f6',
        display:'flex',gap:10,alignItems:'center',flexShrink:0,
        background:'#fafafa',
      }}>
        {/* Ring + play/pause */}
        <div style={{position:'relative',width:52,height:52,flexShrink:0}}>
          <Ring progress={prog} size={52} stroke={3}/>
          <button
            onClick={handlePauseResume}
            disabled={ended}
            style={{
              position:'absolute',inset:4,borderRadius:'50%',
              background:ended?'#e5e7eb':'#10b981',border:'none',
              cursor:ended?'default':'pointer',
              display:'flex',alignItems:'center',justifyContent:'center',
              color:ended?'#9ca3af':'#fff',transition:'all .15s',
            }}>
            {isPause?<Play size={18}/>:<Pause size={18}/>}
          </button>
        </div>
        {/* Status */}
        <div style={{flex:1,minWidth:0}}>
          <p style={{margin:0,fontSize:13,fontWeight:700,color:'#111827'}}>
            {isPause?t(language,'banner.paused'):isPlay?t(language,'banner.playing'):ended?t(language,'banner.finished'):t(language,'banner.ready')}
          </p>
          <p style={{margin:0,fontSize:11,color:'#9ca3af'}}>
            {langMeta(selectedLang).flag} {langMeta(selectedLang).label}
            {' · '}{Math.round(prog*100)}%
          </p>
        </div>
        {/* Replay */}
        <button onClick={handleReplayClick} style={{
          height:40,paddingInline:14,borderRadius:12,
          background:'#f0fdf4',border:'1.5px solid #bbf7d0',
          color:'#065f46',fontWeight:700,fontSize:13,
          display:'flex',alignItems:'center',gap:6,
          cursor:'pointer',flexShrink:0}}>
          <RotateCcw size={14}/>
          {t(language,'btn.replay')}
        </button>
        <button onClick={close} style={{
          height:40,paddingInline:14,borderRadius:12,
          background:'#f3f4f6',border:'none',
          color:'#374151',fontWeight:600,fontSize:13,
          cursor:'pointer',flexShrink:0}}>
          {t(language,'btn.close')}
        </button>
      </div>
    </div>
  );
}
