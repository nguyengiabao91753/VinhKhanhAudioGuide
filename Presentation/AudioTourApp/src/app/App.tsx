import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import MapView from '../components/MapView';
import BottomPanel from '../components/BottomPanel';
import NarrationBanner, { type BannerMode } from '../components/NarrationBanner';
import SimulationSidebar, { type Waypoint } from '../components/Simulationsidebar';
import MenuOverlay from '../components/MenuOverlay';
import { Menu, Navigation2, Compass } from 'lucide-react';
import { LanguageSelector } from '../features/languageSelection/ui/LanguageSelector';
import type { AppLanguage } from '../pages/OnboardingPage';
import type { Tour } from '../types';
import type { PoiDto } from '../entities/poi';
import type { LocalizedData } from '../entities/poi';
import type { TourDto } from '../entities/tour';
import { fetchPois } from '../shared/lib';
import { fetchTours } from '../features/tour';
import { GeofenceEngine } from '../features/geofence/model/GeofenceEngine';
import { t } from '../shared/i18n';
import { AudioTierEngine } from '../features/audio/lib/AudioTierEngine';
import { useSessionHeartbeat } from "../shared/lib/useSessionHeartbeat";
import { useBrowserLocation } from "../shared/lib/useBrowserLocation";
import {
  playNarration, stopNarration, speakNotification, subscribeProgress,
} from '../engines/NarrationEngine';
import {
  generateAudioForPoi, prefetchAudioForPoi, getCachedAudio,
  isPlayableUrl,
} from '../features/audio/model/Audiogenerationservice';
import { SmoothLocationService, type SmoothLocation } from '../features/location/lib/SmoothLocationService';
import type { GeofenceMode } from '../shared/types/geofence';

if (typeof document !== 'undefined' && !document.getElementById('app-kf')) {
  const s = document.createElement('style');
  s.id = 'app-kf';
  s.textContent = `@keyframes slideDown{from{transform:translateX(-50%) translateY(-20px);opacity:0}to{transform:translateX(-50%) translateY(0);opacity:1}}`;
  document.head.appendChild(s);
}

const API_BASE         = import.meta.env.VITE_API_ENDPOINT || 'https://localhost:7047/api';
const FAVORITES_KEY    = 'autonarration_favorites';
const OFFLINE_POIS_KEY = 'autonarration_offline_pois';

// ── Helpers ─────────────────────────────────────────────────────────────────
function getLd(poi: PoiDto, lang: string): LocalizedData | undefined {
  return poi.localizedData?.find(l => l.langCode === lang) ?? poi.localizedData?.[0];
}
function poiName(poi: PoiDto, lang: string) { return getLd(poi, lang)?.name || poi.id; }

function mapTourDto(tour: TourDto): Tour {
  const vi = tour.localizedData?.find(l => l.langCode === 'vi');
  const en = tour.localizedData?.find(l => l.langCode === 'en');
  return {
    id: tour.id,
    name:        { vi: vi?.name        || tour.name        || '', en: en?.name        || tour.name        || '' },
    description: { vi: vi?.description || tour.description || '', en: en?.description || tour.description || '' },
    poiIds: tour.poiIds,
    imageUrl: tour.banner || tour.thumbnail,
  };
}

function logNarration(_poiId: string, _lang: string, _source: string) {
  // Disabled: /api/narration-log not yet implemented on backend
  // Uncomment when endpoint is ready:
  // fetch(`${API_BASE}/narration-log`, {
  //   method: 'POST', headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify({ poiId: _poiId, language: _lang, source: _source, timestamp: new Date().toISOString() }),
  // }).catch(() => {});
}
function hav(la1:number,ln1:number,la2:number,ln2:number){
  const R=6371000,d=Math.PI/180;
  const a=Math.sin((la2-la1)*d/2)**2+Math.cos(la1*d)*Math.cos(la2*d)*Math.sin((ln2-ln1)*d/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}
function totalWpDist(wps: Waypoint[]): number {
  let d=0; for(let i=1;i<wps.length;i++) d+=hav(wps[i-1].lat,wps[i-1].lng,wps[i].lat,wps[i].lng); return d;
}
function safeLang(l: string): 'vi'|'en' { return (l==='vi'||l==='en') ? l : 'en'; }

// Approach notification messages per language
const APPROACH_MSG: Record<string,(name:string)=>string> = {
  vi:    n=>`Bạn đang đến gần ${n}`,
  en:    n=>`Approaching ${n}`,
  fr:    n=>`Vous approchez de ${n}`,
  de:    n=>`Sie nähern sich ${n}`,
  es:    n=>`Se acerca a ${n}`,
  it:    n=>`Si sta avvicinando a ${n}`,
  pt:    n=>`Aproximando-se de ${n}`,
  ru:    n=>`Вы приближаетесь к ${n}`,
  ja:    n=>`${n}に近づいています`,
  ko:    n=>`${n}에 가까워지고 있습니다`,
  zh:    n=>`正在接近${n}`,
  'zh-TW':n=>`正在接近${n}`,
  th:    n=>`กำลังเข้าใกล้ ${n}`,
  ar:    n=>`أنت تقترب من ${n}`,
};
const WAIT_MSG: Record<string, string> = {
  vi:'Chờ 1 nha, để tôi chuẩn bị audio', en:'Please wait, preparing audio',
  fr:"Veuillez patienter, préparation de l'audio", de:'Bitte warten, Audio wird vorbereitet',
  es:'Por favor espere, preparando el audio', it:'Attendere, preparazione audio',
  pt:'Por favor aguarde, a preparar o áudio', ru:'Подождите, подготовка аудио',
  ja:'お待ちください、オーディオを準備しています', ko:'잠시만 기다려주세요',
  zh:'请稍候，正在准备音频', 'zh-TW':'請稍候，正在準備音頻',
  th:'โปรดรอ กำลังเตรียมเสียง', ar:'يرجى الانتظار، جارٍ تجهيز الصوت',
};

// ── App ──────────────────────────────────────────────────────────────────────
interface AppProps { initialLanguage?: AppLanguage; }

export default function App({ initialLanguage = 'vi' }: AppProps) {
  const [location, setLocation]   = useState<{lat:number;lng:number}|null>(null);
  const [bearing, setBearing]     = useState(0);
  const [headingUp, setHeadingUp] = useState(false);
  const [pois, setPois]           = useState<PoiDto[]>([]);
  const [tours, setTours]         = useState<Tour[]>([]);
  const [isTracking, setIsTracking]       = useState(false);
  const [language, setLanguage]           = useState<AppLanguage>(initialLanguage);
  const [playingPoi, setPlayingPoi]       = useState<PoiDto|null>(null);
  const [bannerMode, setBannerMode]       = useState<BannerMode>('auto');
  const [isGenerating, setIsGenerating]   = useState(false);
  const [narrationProgress, setNarrationProgress] = useState(0);
  const [error, setError]                 = useState<string|null>(null);
  const [gpsPollMs, setGpsPollMs]         = useState(5000);
  const [geofenceMode, setGeofenceMode]   = useState<GeofenceMode>('CRUISE');
  const [approachToast, setApproachToast] = useState<{poi:PoiDto;mode:'APPROACH'|'CORE'}|null>(null);
  const [isMenuOpen, setIsMenuOpen]       = useState(false);
  const [activeTab, setActiveTab]         = useState<'tours'|'favorites'|'offline'>('tours');
  const [selectedTour, setSelectedTour]   = useState<Tour|null>(null);
  const [isOffline, setIsOffline]         = useState(false);
  const { lat, lng } = useBrowserLocation();
  const [hasDownloadedData, setHasDownloadedData] = useState(()=>!!localStorage.getItem(OFFLINE_POIS_KEY));
  const [favorites, setFavorites]         = useState<string[]>(()=>{
    try{return JSON.parse(localStorage.getItem(FAVORITES_KEY)||'[]');}catch{return [];}
  });

  // Simulation
  const [isSimulating, setIsSimulating]         = useState(false);
  const [simSpeed, setSimSpeed]                 = useState(1.4);
  const [waypoints, setWaypoints]               = useState<Waypoint[]>([]);
  const [pickingWaypoints, setPickingWaypoints] = useState(false);
  const [currentLeg, setCurrentLeg]             = useState(0);

  const geofenceRef    = useRef(new GeofenceEngine({cruisePollMs:5000,approachPollMs:1000,
    bufferRadiusMeters:100,coreRadiusMeters:30,enterDebounceMs:3000,cooldownMs:5*60*1000}));
  const audioRef       = useRef(AudioTierEngine.getInstance());
  const smoothLocRef   = useRef(SmoothLocationService.getInstance());
  const simIntervalRef = useRef<ReturnType<typeof setInterval>|null>(null);
  const narTimerRef    = useRef<ReturnType<typeof setInterval>|null>(null);
  const simLocRef      = useRef<{lat:number;lng:number}>({lat:10.7578,lng:106.7042});
  const simLegRef      = useRef(0);
  const locationRef    = useRef<{lat:number;lng:number}|null>(null);
  const relevantPoisRef= useRef<PoiDto[]>([]);
  const selectedTourRef= useRef<Tour|null>(null);
  const favoritesRef   = useRef<string[]>([]);
  const languageRef    = useRef<AppLanguage>(initialLanguage);
  const prevModeRef    = useRef<Record<string,GeofenceMode>>({});
  const speedRef       = useRef(0);
  const lastGpsBearingAtRef = useRef(0);
  const headingUpRef   = useRef(false);
  // Track active HTML audio element for progress
  const activeAudioRef = useRef<HTMLAudioElement|null>(null);
  // Mirror of playingPoi for use in callbacks without stale closure
  const playingPoiRef  = useRef<PoiDto|null>(null);
  // AbortController for in-flight audio generation
  const genAbortRef    = useRef<AbortController|null>(null);

  useEffect(()=>{ selectedTourRef.current=selectedTour; },[selectedTour]);
  // CRITICAL: keep playingPoiRef in sync so handlePoiPlay's stale-closure check works
  useEffect(()=>{ playingPoiRef.current=playingPoi; },[playingPoi]);
  useEffect(()=>{ favoritesRef.current=favorites; },[favorites]);
  useEffect(()=>{ languageRef.current=language; audioRef.current.setLanguage(language); },[language]);
  useEffect(()=>{ headingUpRef.current=headingUp; },[headingUp]);

  // Progress from Web Speech (TTS)
  useEffect(()=>{ return subscribeProgress(p=>setNarrationProgress(p)); },[]);

  console.log("playingPoi?.id =", playingPoi?.id);
  console.log("selectedTour?.id =", selectedTour?.id);

  useSessionHeartbeat({
  lang: language,
  currentPoiId: playingPoi ? playingPoi.id : null,
  tourId: selectedTour ? selectedTour.id : null,
  lat,
  lng,
  });

  // ── Data loading ──────────────────────────────────────────────────────────
  useEffect(()=>{
    let cancelled=false;
    if(isOffline&&hasDownloadedData){
      const s=localStorage.getItem(OFFLINE_POIS_KEY);
      if(s)try{setPois(JSON.parse(s));}catch{}
      return;
    }
    (async()=>{
      try{
        const [pd,td]=await Promise.all([fetchPois(),fetchTours()]);
        if(cancelled)return;
        setPois(pd); setTours(td.map(mapTourDto));
      }catch(e){console.error('load',e);}
    })();
    return()=>{cancelled=true;};
  },[isOffline,hasDownloadedData]);

  useEffect(()=>{localStorage.setItem(FAVORITES_KEY,JSON.stringify(favorites));},[favorites]);

  const relevantPois = useMemo(()=>{
    const r=selectedTour?pois.filter(p=>selectedTour.poiIds.includes(p.id)):pois;
    relevantPoisRef.current=r; return r;
  },[pois,selectedTour]);

  // ── GPS ────────────────────────────────────────────────────────────────────
  useEffect(()=>{
    if(isSimulating)return;
    const loc=smoothLocRef.current;
    const unsub=loc.subscribe((sl:SmoothLocation)=>{
      const nl={lat:sl.lat,lng:sl.lng};
      setLocation(nl); locationRef.current=nl;
      speedRef.current = sl.speed;

      // Moving fast enough: trust GPS course over noisy compass.
      if(sl.speed > 1.2){
        lastGpsBearingAtRef.current = Date.now();
        setBearing(prev=>{
          let diff=sl.bearing-prev;
          if(diff>180)diff-=360;if(diff<-180)diff+=360;
          const step = Math.max(-12, Math.min(12, diff * 0.22));
          return Math.round((prev+step+360)%360);
        });
      }
      setError(null);
    });
    loc.start();
    return()=>{unsub();loc.stop();};
  },[isSimulating]);

  // ── Compass ────────────────────────────────────────────────────────────────
  useEffect(()=>{
    let smoothed:number|null=null,lastMs=0;
    const ALPHA=0.08,THR=2,GAP=160;
    const h=(e:DeviceOrientationEvent)=>{
      if (!headingUpRef.current) return;
      // Ignore compass updates while moving; GPS course is much stabler then.
      if (speedRef.current > 1.2) return;
      if (Date.now() - lastGpsBearingAtRef.current < 1500) return;

      const wk=(e as unknown as{webkitCompassHeading?:number}).webkitCompassHeading;
      const raw=wk!==undefined?wk:e.alpha!==null?(360-e.alpha!)%360:null;
      if(raw===null)return;
      if(smoothed===null){smoothed=raw;return;}
      let diff=raw-smoothed;if(diff>180)diff-=360;if(diff<-180)diff+=360;
      const clamped = Math.max(-15, Math.min(15, diff));
      smoothed=(smoothed+clamped*ALPHA+360)%360;
      const now=Date.now();
      if(Math.abs(clamped*ALPHA)<THR&&now-lastMs<GAP)return;
      lastMs=now;setBearing(Math.round(smoothed));
    };
    window.addEventListener('deviceorientationabsolute',h as EventListener,true);
    window.addEventListener('deviceorientation',h as EventListener,true);
    return()=>{
      window.removeEventListener('deviceorientationabsolute',h as EventListener,true);
      window.removeEventListener('deviceorientation',h as EventListener,true);
    };
  },[]);

  // ── Geofence + approach notifications ────────────────────────────────────
  useEffect(()=>{
    if(!location||!isTracking)return;
    const s=geofenceRef.current.updatePosition(location,relevantPois);
    setGeofenceMode(s.mode); locationRef.current=location;
    if(s.suggestedPollMs!==gpsPollMs)setGpsPollMs(s.suggestedPollMs);

    const states=geofenceRef.current.getStates();
    const lang=languageRef.current;
    for(const poi of relevantPois){
      const st=states[poi.id];if(!st)continue;
      const mode:GeofenceMode=st.isInCore?'CORE':st.isInBuffer?'APPROACH':'CRUISE';
      const prev=prevModeRef.current[poi.id]??'CRUISE';
      if(prev!==mode){
        prevModeRef.current[poi.id]=mode;
        if(mode==='APPROACH'||mode==='CORE'){
          setApproachToast({poi,mode});
          setTimeout(()=>setApproachToast(null),4000);
          const name=poiName(poi,lang);
          const msg=(APPROACH_MSG[lang]??APPROACH_MSG.en)(name);
          speakNotification(msg,lang);
        }
      }
    }

    // Prefetch audio for buffer POIs
    for(const poi of geofenceRef.current.getPrefetchPois(relevantPois,new Set())){
      const ld=getLd(poi,lang);
      if(!ld?.descriptionAudio) prefetchAudioForPoi(poi,lang);
      geofenceRef.current.markPrefetched(poi.id);
    }
  },[location,isTracking,relevantPois,gpsPollMs]);

  // ── Core play function ─────────────────────────────────────────────────────
  /**
   * Play POI in a language. Flow:
   * 1. Cached blob/URL → play immediately
   * 2. DB has descriptionAudio for lang → play
   * 3. No audio → generate (show loading, speak wait message)
   * 4. TTS fallback
   */
  const playPoiInLang = useCallback(async (poi: PoiDto, lang: string, isManual=false) => {
    // Cancel any in-flight generation
    if(genAbortRef.current){ genAbortRef.current.abort(); genAbortRef.current=null; }
    const abort = new AbortController();
    genAbortRef.current = abort;

    stopNarration(); audioRef.current.stop();
    if(activeAudioRef.current){ activeAudioRef.current.pause(); activeAudioRef.current=null; }
    setNarrationProgress(0);
    logNarration(poi.id, lang, 'play');

    const ld = getLd(poi, lang);

    // 1. Cached blob/URL from earlier generation?
    const cached = getCachedAudio(poi.id, lang);
    if(cached){ _playUrl(cached, poi, lang); return; }

    // 2. DB has audio for this lang? Guard against non-URL values like 'MAIN'
    if(isPlayableUrl(ld?.descriptionAudio)){ _playUrl(ld.descriptionAudio, poi, lang); return; }

    // 3. Need to generate — show loading + speak "wait" immediately
    if(isManual){
      setIsGenerating(true);
      speakNotification(WAIT_MSG[lang] || WAIT_MSG.en, lang);
    }

    const url = await generateAudioForPoi(poi, lang);

    // If aborted (user clicked something else while we were generating) → discard
    if(abort.signal.aborted){ if(isManual)setIsGenerating(false); return; }
    genAbortRef.current = null;
    if(isManual) setIsGenerating(false);

    if(url){ _playUrl(url, poi, lang); return; }

    // 4. TTS fallback
    const text = ld?.descriptionText || ld?.description ||
      getLd(poi,'vi')?.descriptionText || getLd(poi,'vi')?.description || '';
    if(text) playNarration(text, safeLang(lang), ()=>{});
  },[]);

  function _playUrl(url: string, fallbackPoi?: PoiDto, fallbackLang?: string){
    const a=new Audio(url);
    activeAudioRef.current=a;
    a.onplay=()=>setNarrationProgress(0);
    a.ontimeupdate=()=>{if(a.duration>0)setNarrationProgress(a.currentTime/a.duration);};
    a.onended=()=>{setNarrationProgress(1);activeAudioRef.current=null;};
    a.onerror=()=>{
      setNarrationProgress(0);activeAudioRef.current=null;
      // Audio URL failed → TTS fallback
      if(fallbackPoi&&fallbackLang){
        const ld=getLd(fallbackPoi,fallbackLang);
        const text=ld?.descriptionText||ld?.description||
          getLd(fallbackPoi,'vi')?.descriptionText||getLd(fallbackPoi,'vi')?.description||'';
        if(text)playNarration(text,safeLang(fallbackLang),()=>{});
      }
    };
    a.play().catch(()=>{
      activeAudioRef.current=null;
      if(fallbackPoi&&fallbackLang){
        const ld=getLd(fallbackPoi,fallbackLang);
        const text=ld?.descriptionText||ld?.description||
          getLd(fallbackPoi,'vi')?.descriptionText||getLd(fallbackPoi,'vi')?.description||'';
        if(text)playNarration(text,safeLang(fallbackLang),()=>{});
      }
    });
  }

  // ── Language change while POI is open → re-play in new language ───────────
  const prevLanguageRef = useRef<AppLanguage>(initialLanguage);
  useEffect(()=>{
    if(language === prevLanguageRef.current) return;
    prevLanguageRef.current = language;
    if(playingPoi){
      // Trigger re-play in new language (with loading if no audio)
      playPoiInLang(playingPoi, language, bannerMode==='manual');
    }
  },[language, playingPoi, bannerMode, playPoiInLang]);

  // ── Narration heartbeat (auto mode) ──────────────────────────────────────
  useEffect(()=>{
    if(!isTracking)return;
    narTimerRef.current=setInterval(async()=>{
      if(!locationRef.current)return;
      if(activeAudioRef.current&&!activeAudioRef.current.paused)return;
      if(audioRef.current.state.isPlaying)return;

      const ps=relevantPoisRef.current;
      const tour=selectedTourRef.current;
      const favs=favoritesRef.current;
      const lang=languageRef.current;
      // For auto: use empty set (cooldown handles dedup, not playedIds)
      const ready=geofenceRef.current.getReadyPois(ps,new Set(),{
        selectedTourPoiIds:tour?.poiIds??[],favorites:favs});
      if(!ready.length)return;

      const target=ready[0];
      setBannerMode('auto');
      setPlayingPoi(target);
      geofenceRef.current.markTriggered(target.id);
      setNarrationProgress(0);

      const ld=getLd(target,lang);
      const cached=getCachedAudio(target.id,lang);
      const audioUrl=cached||(isPlayableUrl(ld?.descriptionAudio)?ld.descriptionAudio:undefined);

      const finish=()=>{
        setTimeout(()=>setPlayingPoi(null),3000);
        activeAudioRef.current=null;
      };

      if(audioUrl){
        const a=new Audio(audioUrl);
        activeAudioRef.current=a;
        a.ontimeupdate=()=>{if(a.duration>0)setNarrationProgress(a.currentTime/a.duration);};
        a.onended=finish;
        a.onerror=()=>{
          const t=ld?.descriptionText||ld?.description||'';
          if(t)playNarration(t,safeLang(lang),finish);else finish();
        };
        a.play().catch(()=>{
          const t=ld?.descriptionText||ld?.description||'';
          if(t)playNarration(t,safeLang(lang),finish);else finish();
        });
      } else {
        // No audio → generate async then play
        const genUrl=await generateAudioForPoi(target,lang);
        if(genUrl){
          const a=new Audio(genUrl);
          activeAudioRef.current=a;
          a.ontimeupdate=()=>{if(a.duration>0)setNarrationProgress(a.currentTime/a.duration);};
          a.onended=finish; a.play().catch(finish);
        } else {
          const t=ld?.descriptionText||ld?.description||'';
          if(t)playNarration(t,safeLang(lang),finish);else finish();
        }
      }
    },500);
    return()=>{if(narTimerRef.current)clearInterval(narTimerRef.current);};
  },[isTracking]);

  // ── User click: always allowed, no locking ───────────────────────────────
  // Uses refs (playingPoiRef, languageRef) NOT state — avoids stale closure entirely
  const handlePoiPlay=useCallback((poi:PoiDto)=>{
    const currentlyPlaying = playingPoiRef.current;
    const isAudioActive =
      (activeAudioRef.current && !activeAudioRef.current.paused) ||
      audioRef.current.state.isPlaying;

    // Toggle off: same POI AND actively playing → stop audio only (keep banner)
    // NOTE: if banner was closed (playingPoi===null in state), always replay
    if(currentlyPlaying?.id === poi.id && isAudioActive){
      stopNarration(); audioRef.current.stop();
      if(activeAudioRef.current){ activeAudioRef.current.pause(); activeAudioRef.current=null; }
      return;
    }
    // If same POI but audio not active (just closed/finished) → fall through to replay

    // Any other case (new POI, or same POI but stopped) → always play
    setBannerMode('manual');
    setPlayingPoi(poi);
    playPoiInLang(poi, languageRef.current, true);
  },[playPoiInLang]); // only playPoiInLang — everything else via refs

  const handleReplay=useCallback((poi:PoiDto,lang?:string)=>{
    playPoiInLang(poi, lang || languageRef.current, true);
  },[playPoiInLang]); // use languageRef, not language state

  // ── Controls ──────────────────────────────────────────────────────────────
  const startTracking=useCallback(()=>{setIsTracking(true);setError(null);geofenceRef.current.reset();},[]);
  const stopTracking=useCallback(()=>{
    setIsTracking(false);stopNarration();audioRef.current.stop();
    if(activeAudioRef.current){activeAudioRef.current.pause();activeAudioRef.current=null;}
    setPlayingPoi(null);setGpsPollMs(5000);setGeofenceMode('CRUISE');
    geofenceRef.current.reset();
  },[]);
  const toggleFavorite=useCallback((id:string)=>{
    setFavorites(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id]);
  },[]);

  useEffect(()=>{
    geofenceRef.current.reset();
    setPlayingPoi(null);stopNarration();
  },[selectedTour]);

  // ── Simulation ────────────────────────────────────────────────────────────
  const stopSim=useCallback(()=>{
    if(simIntervalRef.current)clearInterval(simIntervalRef.current);
    simIntervalRef.current=null;
    setIsSimulating(false);setPickingWaypoints(false);
    setCurrentLeg(0);simLegRef.current=0;
    (geofenceRef.current as unknown as{config:{enterDebounceMs:number}}).config.enterDebounceMs=3000;
    smoothLocRef.current.start();
  },[]);
  const startSim=useCallback(()=>{
    smoothLocRef.current.stop();
    setIsSimulating(true);setCurrentLeg(0);simLegRef.current=0;
    (geofenceRef.current as unknown as{config:{enterDebounceMs:number}}).config.enterDebounceMs=800;
    const sl=waypoints[0]??location??{lat:10.7578,lng:106.7042};
    simLocRef.current={lat:sl.lat,lng:sl.lng};
    locationRef.current={lat:sl.lat,lng:sl.lng};
    setLocation({lat:sl.lat,lng:sl.lng});
  },[waypoints,location]);
  const toggleSimulation=useCallback(()=>{isSimulating?stopSim():startSim();},[isSimulating,stopSim,startSim]);

  useEffect(()=>{
    if(!isSimulating)return;
    if(simIntervalRef.current)clearInterval(simIntervalRef.current);
    const MS=100;
    simIntervalRef.current=setInterval(()=>{
      let tLat:number,tLng:number;
      if(waypoints.length>0){
        const leg=simLegRef.current;
        if(leg>=waypoints.length){stopSim();return;}
        tLat=waypoints[leg].lat;tLng=waypoints[leg].lng;
      }else{
        const next=relevantPoisRef.current[0];
        if(!next)return;
        tLat=next.position.lat;tLng=next.position.lng;
      }
      const curr=simLocRef.current;
      const dx=tLng-curr.lng,dy=tLat-curr.lat;
      const deg=Math.sqrt(dx*dx+dy*dy);
      const step=simSpeed*(MS/1000)/111320;
      if(deg<step*1.5){
        simLocRef.current={lat:tLat,lng:tLng};
        if(waypoints.length>0){simLegRef.current++;setCurrentLeg(simLegRef.current);}
      }else{
        simLocRef.current={lat:curr.lat+(dy/deg)*step,lng:curr.lng+(dx/deg)*step};
      }
      const pos={...simLocRef.current};
      setLocation(pos);locationRef.current=pos;
      if(isTracking)geofenceRef.current.updatePosition(pos,relevantPoisRef.current);
    },MS);
    return()=>{if(simIntervalRef.current)clearInterval(simIntervalRef.current);};
  },[isSimulating,simSpeed,waypoints,stopSim,isTracking]);

  const handleMapClick=useCallback((lat:number,lng:number)=>{
    if(!pickingWaypoints)return;
    setWaypoints(prev=>[...prev,{id:`wp-${Date.now()}`,lat,lng,label:`Điểm ${prev.length+1}`}]);
  },[pickingWaypoints]);

  const totalDist=useMemo(()=>totalWpDist(waypoints),[waypoints]);
  useEffect(()=>()=>{
    if(simIntervalRef.current)clearInterval(simIntervalRef.current);
    stopNarration();
  },[]);

  // ── Render ────────────────────────────────────────────────────────────────
  return(
    <div className="flex flex-col h-screen bg-gray-100 overflow-hidden relative">
      <div className="flex-1 relative z-0 flex overflow-hidden">
        <div className="flex-1 relative">
          <MapView
            location={location}
            pois={relevantPois}
            playedIds={new Set()} // no locking — cooldown in GeofenceEngine handles dedup
            playingPoi={playingPoi}
            language={language}
            bearing={bearing}
            headingUp={headingUp}
            favorites={favorites}
            onToggleFavorite={toggleFavorite}
            onPoiPlay={handlePoiPlay}
            onMapClick={handleMapClick}
            pickingWaypoints={pickingWaypoints}
            isOffline={isOffline}
          />

          {/* Top HUD */}
          <div className="absolute top-4 left-4 right-4 z-[1000] flex justify-between items-start pointer-events-none">
            <div className="flex flex-col gap-2">
              <button onClick={()=>setIsMenuOpen(true)}
                className="bg-white/90 backdrop-blur-md p-3 rounded-2xl shadow-lg pointer-events-auto text-gray-800 hover:bg-gray-50">
                <Menu size={24}/>
              </button>
              <div className="bg-white/90 backdrop-blur-md px-3 py-2 rounded-2xl shadow-lg pointer-events-auto flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full ${location?(isTracking?'bg-emerald-500 animate-pulse':'bg-blue-400 animate-pulse'):'bg-gray-300'}`}/>
                <span className="text-sm font-semibold text-gray-800">
                  {!location?t(language,'gps.loading')
                  :isSimulating?`🚶 ${simSpeed.toFixed(1)}m/s`
                  :isTracking?t(language,'gps.exploring')
                  :t(language,'gps.ready')}
                </span>
              </div>
              {isGenerating&&(
                <div className="bg-amber-500 text-white px-3 py-2 rounded-2xl shadow-lg pointer-events-auto text-xs font-bold animate-pulse">
                  {t(language,'audio.preparing')}
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2 items-end">
              {/* Language selector — native dropdown */}
              <div className="pointer-events-auto">
                <LanguageSelector value={language} onChange={v=>setLanguage(v as AppLanguage)} />
              </div>
              <button onClick={()=>setHeadingUp(h=>!h)}
                className={`bg-white/90 backdrop-blur-md p-2.5 rounded-2xl shadow-lg pointer-events-auto ${headingUp?'text-blue-600':'text-gray-500'}`}>
                {headingUp?<Navigation2 size={20}/>:<Compass size={20}/>}
              </button>
              {isOffline&&(
                <div className="bg-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg pointer-events-auto">OFFLINE</div>
              )}
            </div>
          </div>
        </div>

        {isSimulating&&(
          <SimulationSidebar
            language={language}
            speed={simSpeed}
            onSpeedChange={setSimSpeed}
            waypoints={waypoints}
            onClearWaypoints={()=>{setWaypoints([]);setCurrentLeg(0);simLegRef.current=0;}}
            onRemoveWaypoint={id=>setWaypoints(p=>p.filter(w=>w.id!==id))}
            isPickingWaypoints={pickingWaypoints}
            onTogglePicking={()=>setPickingWaypoints(v=>!v)}
            currentLeg={currentLeg}
            totalDistance={totalDist}
          />
        )}
      </div>

      {error&&(
        <div className="absolute top-20 left-4 right-4 z-[1000] bg-red-100 border border-red-200 text-red-700 px-4 py-3 rounded-xl shadow-sm text-sm">{error}</div>
      )}

      {approachToast&&(
        <div style={{
          position:'absolute',top:isSimulating?80:72,left:'50%',
          transform:'translateX(-50%)',zIndex:1800,
          background:approachToast.mode==='CORE'?'linear-gradient(135deg,#065f46,#059669)':'linear-gradient(135deg,#1e40af,#2563eb)',
          color:'#fff',borderRadius:16,padding:'10px 16px',
          boxShadow:'0 8px 24px rgba(0,0,0,.25)',
          display:'flex',alignItems:'center',gap:10,maxWidth:280,
          animation:'slideDown .25s ease',whiteSpace:'nowrap',
        }}>
          <span style={{fontSize:20}}>{approachToast.mode==='CORE'?'📍':'🔔'}</span>
          <div>
            <p style={{margin:0,fontWeight:700,fontSize:13}}>
              {approachToast.mode==='CORE'?t(language,'toast.arrived'):t(language,'toast.approaching')}
            </p>
            <p style={{margin:0,fontSize:12,opacity:.85}}>{poiName(approachToast.poi,language)}</p>
          </div>
        </div>
      )}

      <NarrationBanner
        poi={playingPoi}
        mode={bannerMode}
        language={language}
        userLocation={location}
        narrationProgress={narrationProgress}
        isGenerating={isGenerating}
        onClose={()=>{
          setPlayingPoi(null);audioRef.current.stop();stopNarration();
          if(activeAudioRef.current){activeAudioRef.current.pause();activeAudioRef.current=null;}
          setNarrationProgress(0);
        }}
        onReplay={handleReplay}
      />

      <BottomPanel
        isTracking={isTracking}
        onStart={startTracking}
        onStop={stopTracking}
        playingPoi={playingPoi}
        playingPoiName={playingPoi?poiName(playingPoi,language):null}
        isSimulating={isSimulating}
        onToggleSimulation={toggleSimulation}
        hasLocation={!!location}
        language={language}
        favorites={favorites}
        onToggleFavorite={toggleFavorite}
      />

      <MenuOverlay
        isOpen={isMenuOpen}
        onClose={()=>setIsMenuOpen(false)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        language={language}
        tours={tours}
        selectedTour={selectedTour}
        onSelectTour={setSelectedTour}
        pois={pois}
        favorites={favorites}
        onToggleFavorite={toggleFavorite}
        isOffline={isOffline}
        onToggleOffline={()=>setIsOffline(!isOffline)}
        hasDownloadedData={hasDownloadedData}
        onDownloadData={()=>{if(pois.length>0){localStorage.setItem(OFFLINE_POIS_KEY,JSON.stringify(pois));setHasDownloadedData(true);}}}
        onClearData={()=>{localStorage.removeItem(OFFLINE_POIS_KEY);setHasDownloadedData(false);setIsOffline(false);}}
      />
    </div>
  );
}
