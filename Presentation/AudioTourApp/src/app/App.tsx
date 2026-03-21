import { useState, useEffect, useRef, useCallback, useMemo } from 'react';

// Inject slide-down keyframe for approach toast
if (typeof document !== 'undefined' && !document.getElementById('app-kf')) {
  const s = document.createElement('style');
  s.id = 'app-kf';
  s.textContent = '@keyframes slideDown{from{transform:translateX(-50%) translateY(-20px);opacity:0}to{transform:translateX(-50%) translateY(0);opacity:1}}';
  document.head.appendChild(s);
}
import MapView from '../components/MapView';
import BottomPanel from '../components/BottomPanel';
import NarrationBanner, { type BannerMode } from '../components/NarrationBanner';
import SimulationSidebar, { type Waypoint } from '../components/Simulationsidebar';
import MenuOverlay from '../components/MenuOverlay';
import { Menu, Navigation2, Compass } from 'lucide-react';
import type { POI, Tour } from '../types';
import type { LocalizedData, PoiDto } from '../entities/poi';
import type { TourDto } from '../entities/tour';
import { fetchPois } from '../shared/lib';
import { fetchTours } from '../features/tour';
import { GeofenceEngine } from '../features/geofence/model/GeofenceEngine';
import { AudioTierEngine } from '../features/audio/lib/AudioTierEngine';
import { playNarration, stopNarration } from '../engines/NarrationEngine';
import { SmoothLocationService, type SmoothLocation } from '../features/location/lib/SmoothLocationService';
import type { GeofenceMode } from '../shared/types/geofence';

type SupportedLanguage = 'vi' | 'en';
const FAVORITES_KEY   = 'autonarration_favorites';
const OFFLINE_POIS_KEY = 'autonarration_offline_pois';
const API_BASE = import.meta.env.VITE_API_ENDPOINT || 'https://localhost:7047/api';

// ── DTO mappers ───────────────────────────────────────────────────────────
function pickLoc(list: LocalizedData[] | undefined, lang: SupportedLanguage) {
  return list?.find((l) => l.langCode === lang) ?? list?.[0];
}
function mapPoiDto(poi: PoiDto): POI {
  const vi = pickLoc(poi.localizedData, 'vi');
  const en = pickLoc(poi.localizedData, 'en');
  return {
    id: poi.id,
    name: { vi: vi?.name || '', en: en?.name || vi?.name || '' },
    description: { vi: vi?.description || vi?.descriptionText || '', en: en?.description || en?.descriptionText || '' },
    lat: poi.position.lat, lng: poi.position.lng,
    played: false,
    imageUrl: poi.banner || poi.thumbnail,
    range: poi.range ?? 30,
    priority: 1000 - (poi.order ?? 0),
  };
}
function mapTourDto(tour: TourDto): Tour {
  const vi = pickLoc(tour.localizedData, 'vi');
  const en = pickLoc(tour.localizedData, 'en');
  return {
    id: tour.id,
    name: { vi: vi?.name || tour.name || '', en: en?.name || tour.name || '' },
    description: { vi: vi?.description || tour.description || '', en: en?.description || tour.description || '' },
    poiIds: tour.poiIds, imageUrl: tour.banner || tour.thumbnail,
  };
}
async function logNarration(poiId: string, lang: string, source: string) {
  try {
    await fetch(`${API_BASE}/narration-log`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ poiId, language: lang, source, timestamp: new Date().toISOString() }),
    });
  } catch { /* fire-and-forget */ }
}

// ── Haversine ─────────────────────────────────────────────────────────────
function hav(la1:number,ln1:number,la2:number,ln2:number){
  const R=6371000,d2r=Math.PI/180;
  const dLa=(la2-la1)*d2r,dLn=(ln2-ln1)*d2r;
  const a=Math.sin(dLa/2)**2+Math.cos(la1*d2r)*Math.cos(la2*d2r)*Math.sin(dLn/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}
function totalWaypointDist(wps: Waypoint[]): number {
  let d = 0;
  for (let i = 1; i < wps.length; i++) d += hav(wps[i-1].lat, wps[i-1].lng, wps[i].lat, wps[i].lng);
  return d;
}

// ── App ───────────────────────────────────────────────────────────────────
interface AppProps { initialLanguage?: SupportedLanguage; }

export default function App({ initialLanguage = 'vi' }: AppProps) {
  // Core state
  const [location, setLocation]   = useState<{ lat: number; lng: number } | null>(null);
  const [bearing, setBearing]     = useState(0);
  const [headingUp, setHeadingUp] = useState(false);
  const [pois, setPois]           = useState<POI[]>([]);
  const [tours, setTours]         = useState<Tour[]>([]);
  const [isTracking, setIsTracking]           = useState(false);
  const [language, setLanguage]               = useState<SupportedLanguage>(initialLanguage);
  const [playingPoi, setPlayingPoi]           = useState<POI | null>(null);
  const [bannerMode, setBannerMode]           = useState<BannerMode>('auto');
  const [error, setError]                     = useState<string | null>(null);
  const [gpsPollMs, setGpsPollMs]             = useState(5000);
  const [geofenceMode, setGeofenceMode]       = useState<GeofenceMode>('CRUISE');
  const [approachToast, setApproachToast]     = useState<{poi:POI;mode:'APPROACH'|'CORE'}|null>(null);
  const prevModeRef                            = useRef<Record<string, GeofenceMode>>({});
  const [isMenuOpen, setIsMenuOpen]           = useState(false);
  const [activeTab, setActiveTab]             = useState<'tours' | 'favorites' | 'offline'>('tours');
  const [selectedTour, setSelectedTour]       = useState<Tour | null>(null);
  const [isOffline, setIsOffline]             = useState(false);
  const [hasDownloadedData, setHasDownloadedData] = useState(()=>!!localStorage.getItem(OFFLINE_POIS_KEY));
  const [favorites, setFavorites]             = useState<string[]>(()=>{
    try { return JSON.parse(localStorage.getItem(FAVORITES_KEY)||'[]'); } catch { return []; }
  });

  // Simulation
  const [isSimulating, setIsSimulating]           = useState(false);
  const [simSpeed, setSimSpeed]                   = useState(1.4); // m/s
  const [waypoints, setWaypoints]                 = useState<Waypoint[]>([]);
  const [pickingWaypoints, setPickingWaypoints]   = useState(false);
  const [currentLeg, setCurrentLeg]               = useState(0);

  // Refs
  const geofenceRef      = useRef(new GeofenceEngine({ cruisePollMs:5000, approachPollMs:1000,
    bufferRadiusMeters:100, coreRadiusMeters:30, enterDebounceMs:3000, cooldownMs:5*60*1000 }));
  const audioRef         = useRef(AudioTierEngine.getInstance());
  const smoothLocRef     = useRef(SmoothLocationService.getInstance());
  const simIntervalRef   = useRef<ReturnType<typeof setInterval>|null>(null);
  const narrationTimerRef= useRef<ReturnType<typeof setInterval>|null>(null);
  const simLocRef        = useRef<{ lat: number; lng: number }>({ lat: 10.7578, lng: 106.7042 });
  // Ref mirror of location — lets narration heartbeat read current position
  // without being in useEffect deps (which would reset the 1s interval every 100ms)
  const locationRef      = useRef<{ lat: number; lng: number } | null>(null);
  const simLegRef        = useRef(0);

  // ── Data ─────────────────────────────────────────────────────────────
  useEffect(()=>{
    let cancelled=false;
    if(isOffline&&hasDownloadedData){
      const s=localStorage.getItem(OFFLINE_POIS_KEY);
      if(s) try{setPois(JSON.parse(s));}catch{}
      return;
    }
    (async()=>{
      try{
        const [pd,td]=await Promise.all([fetchPois(),fetchTours()]);
        if(cancelled)return;
        setPois(pd.map(mapPoiDto)); setTours(td.map(mapTourDto));
      }catch(e){console.error('load',e);}
    })();
    return ()=>{cancelled=true;};
  },[isOffline,hasDownloadedData]);

  useEffect(()=>{ localStorage.setItem(FAVORITES_KEY,JSON.stringify(favorites)); },[favorites]);

  const relevantPois = useMemo(
    ()=>selectedTour?pois.filter(p=>selectedTour.poiIds.includes(p.id)):pois,
    [pois,selectedTour]
  );

  // ── GPS (always on, not gated by isTracking) ─────────────────────────
  useEffect(()=>{
    if(isSimulating)return;
    const loc=smoothLocRef.current;
    const unsub=loc.subscribe((sl:SmoothLocation)=>{
      const newLoc = {lat:sl.lat,lng:sl.lng};
      setLocation(newLoc);
      locationRef.current = newLoc;
      // Only update from GPS when moving (speed filter already in SmoothLocationService)
      // and only if headingUp is not driven by compass (avoid fighting)
      if (sl.speed > 0.8) setBearing(prev => {
        // Same wraparound-safe short-path blend
        let diff = sl.bearing - prev;
        if (diff >  180) diff -= 360;
        if (diff < -180) diff += 360;
        return Math.round((prev + diff * 0.25 + 360) % 360);
      });
      setError(null);
    });
    loc.start();
    return()=>{unsub();loc.stop();};
  },[isSimulating]);

  // ── DeviceOrientation — smoothed + throttled ────────────────────────
  // Raw compass fires 50–100 Hz with ±15° noise.
  // Fix: exponential low-pass (α=0.12) + 5° threshold gate + 100ms min interval.
  useEffect(()=>{
    let smoothed: number | null = null;
    let lastSetMs = 0;
    const ALPHA      = 0.12;   // lower = smoother but slower (0.08–0.15 is good)
    const THRESHOLD  = 3;      // degrees — ignore changes smaller than this
    const MIN_GAP_MS = 100;    // max 10 updates/sec to React state

    const handleOrientation = (e: DeviceOrientationEvent) => {
      const wk = (e as unknown as{ webkitCompassHeading?: number }).webkitCompassHeading;
      let raw = wk !== undefined ? wk : (e.alpha !== null ? (360 - e.alpha!) % 360 : null);
      if (raw === null) return;

      // Initialise
      if (smoothed === null) { smoothed = raw; return; }

      // Handle 0/360 wraparound: take shortest angular path
      let diff = raw - smoothed;
      if (diff >  180) diff -= 360;
      if (diff < -180) diff += 360;

      // Low-pass filter
      smoothed = (smoothed + diff * ALPHA + 360) % 360;

      // Throttle + threshold gate
      const now = Date.now();
      if (Math.abs(diff * ALPHA) < THRESHOLD && now - lastSetMs < MIN_GAP_MS) return;
      lastSetMs = now;
      setBearing(Math.round(smoothed));
    };

    // Prefer absolute (true north) over relative (magnetic, drifts)
    window.addEventListener('deviceorientationabsolute', handleOrientation as EventListener, true);
    window.addEventListener('deviceorientation',         handleOrientation as EventListener, true);
    return () => {
      window.removeEventListener('deviceorientationabsolute', handleOrientation as EventListener, true);
      window.removeEventListener('deviceorientation',         handleOrientation as EventListener, true);
    };
  }, []);

  // ── Geofence update ──────────────────────────────────────────────────
  useEffect(()=>{
    if(!location||!isTracking)return;
    const s=geofenceRef.current.updatePosition(location,relevantPois);
    setGeofenceMode(s.mode);
    if(s.suggestedPollMs!==gpsPollMs)setGpsPollMs(s.suggestedPollMs);
    locationRef.current = location;

    // Detect APPROACH / CORE transitions per-POI → show toast
    const states = geofenceRef.current.getStates();
    for(const poi of relevantPois){
      const st = states[poi.id];
      if(!st) continue;
      const poiMode: GeofenceMode = st.isInCore ? 'CORE' : st.isInBuffer ? 'APPROACH' : 'CRUISE';
      const prev = prevModeRef.current[poi.id] ?? 'CRUISE';
      if(prev !== poiMode){
        prevModeRef.current[poi.id] = poiMode;
        if(poiMode === 'APPROACH' || poiMode === 'CORE'){
          setApproachToast({poi, mode: poiMode});
          // Auto-dismiss toast after 3s
          setTimeout(()=>setApproachToast(null), 3000);
        }
      }
    }

    for(const poi of geofenceRef.current.getPrefetchPois(relevantPois)){
      audioRef.current.prefetch({id:poi.id,localizedData:[] as LocalizedData[],
        position:{type:'Point',lat:poi.lat,lng:poi.lng},order:0,range:poi.range??30,thumbnail:'',banner:''} as PoiDto);
      geofenceRef.current.markPrefetched(poi.id);
    }
  },[location,isTracking,relevantPois,gpsPollMs]);

  // ── Narration heartbeat ──────────────────────────────────────────────
  // IMPORTANT: location is NOT in deps — it would reset the 1s interval
  // every 100ms during simulation, preventing it from ever firing.
  // We use locationRef.current to read latest position without re-mounting.
  const relevantPoisRef  = useRef(relevantPois);
  const selectedTourRef  = useRef(selectedTour);
  const favoritesRef     = useRef(favorites);
  const languageRef      = useRef(language);
  useEffect(() => { relevantPoisRef.current  = relevantPois;  }, [relevantPois]);
  useEffect(() => { selectedTourRef.current  = selectedTour;  }, [selectedTour]);
  useEffect(() => { favoritesRef.current     = favorites;     }, [favorites]);
  useEffect(() => { languageRef.current      = language;      }, [language]);

  useEffect(()=>{
    if(!isTracking)return;
    narrationTimerRef.current=setInterval(()=>{
      if(!locationRef.current)return;          // no GPS yet
      if(audioRef.current.state.isPlaying)return;
      const pois = relevantPoisRef.current;
      const tour = selectedTourRef.current;
      const favs = favoritesRef.current;
      const lang = languageRef.current;
      const ready=geofenceRef.current.getReadyPois(pois,{
        selectedTourPoiIds:tour?.poiIds??[], favorites:favs });
      if(!ready.length)return;
      const target=ready[0];
      setBannerMode('auto');
      setPlayingPoi(target);
      geofenceRef.current.markTriggered(target.id);
      logNarration(target.id,lang,'auto');
      playNarration(target.description[lang],lang,()=>{
        setPlayingPoi(null);
        setPois(prev=>prev.map(p=>p.id===target.id?{...p,played:true}:p));
      });
    },500); // check every 500ms (was 1000ms)
    return()=>{ if(narrationTimerRef.current)clearInterval(narrationTimerRef.current); };
  },[isTracking]); // ← only isTracking, NOT location

  // ── Controls ─────────────────────────────────────────────────────────
  const startTracking = useCallback(()=>{ setIsTracking(true); setError(null); geofenceRef.current.reset(); },[]);
  const stopTracking  = useCallback(()=>{
    setIsTracking(false); stopNarration(); audioRef.current.stop();
    setPlayingPoi(null); setGpsPollMs(5000); setGeofenceMode('CRUISE');
    geofenceRef.current.reset();
  },[]);
  const toggleFavorite = useCallback((id:string)=>{
    setFavorites(p=>p.includes(id)?p.filter(x=>x!==id):[...p,id]);
  },[]);

  useEffect(()=>{
    geofenceRef.current.reset();
    setPois(p=>p.map(x=>({...x,played:false})));
    setPlayingPoi(null); stopNarration();
  },[selectedTour]);

  // ── Manual POI play (from map click) ─────────────────────────────────
  const handlePoiPlay = useCallback((poi:POI)=>{
    // Same POI & audio active → stop audio but keep banner open
    if(playingPoi?.id===poi.id&&(audioRef.current.state.isPlaying||audioRef.current.state.isPaused)){
      stopNarration(); audioRef.current.stop();
      return;
    }
    stopNarration(); audioRef.current.stop();
    setBannerMode('manual');
    setPlayingPoi(poi);
    logNarration(poi.id,language,'manual');
    playNarration(poi.description[language],language,()=>{
      // Keep banner open — user closes manually. No cooldown.
    });
  },[playingPoi,language]);

  const handleReplay = useCallback((poi:POI)=>{
    stopNarration(); audioRef.current.stop();
    playNarration(poi.description[language],language,()=>{
      if(bannerMode==='auto'){
        setPlayingPoi(null);
        setPois(p=>p.map(x=>x.id===poi.id?{...x,played:true}:x));
      }
      // manual: keep open
    });
  },[language,bannerMode]);

  // ── SIMULATION ────────────────────────────────────────────────────────
  const stopSim = useCallback(()=>{
    if(simIntervalRef.current)clearInterval(simIntervalRef.current);
    simIntervalRef.current=null;
    setIsSimulating(false);
    setPickingWaypoints(false);
    setCurrentLeg(0);
    simLegRef.current=0;
    // Restore real debounce
    (geofenceRef.current as unknown as {config:{enterDebounceMs:number}}).config.enterDebounceMs = 3000;
    smoothLocRef.current.start();
  },[]);

  const startSim = useCallback(()=>{
    smoothLocRef.current.stop();
    setIsSimulating(true);
    setCurrentLeg(0); simLegRef.current=0;
    // Reduce debounce for simulation (moves fast, no GPS jitter)
    (geofenceRef.current as unknown as {config:{enterDebounceMs:number}}).config.enterDebounceMs = 800;
    // Init position: first waypoint OR current location OR default
    const startLat = waypoints[0]?.lat ?? location?.lat ?? 10.7578;
    const startLng = waypoints[0]?.lng ?? location?.lng ?? 106.7042;
    simLocRef.current = { lat: startLat, lng: startLng };
    const startPos = { lat: startLat, lng: startLng };
    locationRef.current = startPos;
    setLocation(startPos);
  },[waypoints,location]);

  const toggleSimulation = useCallback(()=>{
    if(isSimulating){ stopSim(); }
    else { startSim(); }
  },[isSimulating,stopSim,startSim]);

  // Simulation movement loop — recalculates when speed or waypoints change
  useEffect(()=>{
    if(!isSimulating)return;
    if(simIntervalRef.current)clearInterval(simIntervalRef.current);

    const INTERVAL_MS = 100; // 10fps movement ticks
    const stepDeg = simSpeed * (INTERVAL_MS / 1000); // metres per tick

    simIntervalRef.current = setInterval(()=>{
      // Determine target: next waypoint OR next unplayed POI
      let targetLat: number, targetLng: number, isLastTarget: boolean;

      if(waypoints.length > 0){
        const legIdx = simLegRef.current;
        if(legIdx >= waypoints.length){
          // Reached end of route — stop simulation
          stopSim(); return;
        }
        targetLat = waypoints[legIdx].lat;
        targetLng = waypoints[legIdx].lng;
        isLastTarget = legIdx === waypoints.length - 1;
      } else {
        // Fallback: walk toward next unplayed POI
        const curr = simLocRef.current;
        const nextPoi = pois.find(p=>!p.played&&(selectedTour?selectedTour.poiIds.includes(p.id):true));
        if(!nextPoi)return;
        targetLat = nextPoi.lat; targetLng = nextPoi.lng;
        isLastTarget = false;
      }

      const curr = simLocRef.current;
      const dx = targetLng - curr.lng;
      const dy = targetLat - curr.lat;
      const distDeg = Math.sqrt(dx*dx+dy*dy);
      // Convert step from metres to approximate degrees (1°≈111320m)
      const stepDegApprox = stepDeg / 111320;

      if(distDeg < stepDegApprox * 1.5){
        // Arrived at waypoint
        simLocRef.current = { lat: targetLat, lng: targetLng };
        if(waypoints.length > 0){
          const next = simLegRef.current + 1;
          simLegRef.current = next;
          setCurrentLeg(next);
        }
      } else {
        // Move toward target
        const newLat = curr.lat + (dy/distDeg)*stepDegApprox;
        const newLng = curr.lng + (dx/distDeg)*stepDegApprox;
        simLocRef.current = { lat: newLat, lng: newLng };
      }
      const newPos = { ...simLocRef.current };
      setLocation(newPos);
      locationRef.current = newPos;
      // Update geofence inline (don't wait for React effect at high sim speeds)
      if(isTracking) geofenceRef.current.updatePosition(newPos, relevantPoisRef.current);
    }, INTERVAL_MS);

    return ()=>{ if(simIntervalRef.current)clearInterval(simIntervalRef.current); };
  },[isSimulating, simSpeed, waypoints, pois, selectedTour, stopSim]);

  // Map click → add waypoint
  const handleMapClick = useCallback((lat: number, lng: number)=>{
    if(!pickingWaypoints)return;
    setWaypoints(prev=>[...prev, {
      id: `wp-${Date.now()}`,
      lat, lng,
      label: `Điểm ${prev.length+1}`,
    }]);
  },[pickingWaypoints]);

  // Waypoint distance
  const totalDist = useMemo(()=>totalWaypointDist(waypoints),[waypoints]);

  // Cleanup
  useEffect(()=>()=>{
    if(simIntervalRef.current)clearInterval(simIntervalRef.current);
    stopNarration();
  },[]);

  // ── Render ────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col h-screen bg-gray-100 overflow-hidden relative">
      <div className="flex-1 relative z-0 flex overflow-hidden">
        {/* Map */}
        <div className="flex-1 relative">
          <MapView
            location={location}
            pois={relevantPois}
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

              {/* GPS badge */}
              <div className="bg-white/90 backdrop-blur-md px-3 py-2 rounded-2xl shadow-lg pointer-events-auto flex items-center gap-2">
                <div className={`w-2.5 h-2.5 rounded-full transition-colors ${
                  location
                    ? isTracking ? 'bg-emerald-500 animate-pulse' : 'bg-blue-400 animate-pulse'
                    : 'bg-gray-300'
                }`}/>
                <span className="text-sm font-semibold text-gray-800">
                  {!location
                    ? (language==='vi'?'Đang lấy GPS...':'Getting GPS...')
                    : isSimulating
                    ? (language==='vi'?'🚶 Mô phỏng':'🚶 Simulating')
                    : isTracking
                    ? (language==='vi'?'Đang khám phá':'Exploring')
                    : (language==='vi'?'GPS sẵn sàng':'GPS ready')}
                </span>
              </div>

              {isTracking && !isSimulating && (
                <div className="bg-white/90 backdrop-blur-md px-3 py-2 rounded-2xl shadow-lg pointer-events-auto text-xs text-gray-700">
                  <div>Mode: <span className="font-bold text-emerald-600">{geofenceMode}</span></div>
                  <div>Poll: <span className="font-bold">{gpsPollMs/1000}s</span></div>
                </div>
              )}

              {/* Simulation speed badge */}
              {isSimulating && (
                <div className="bg-blue-900/90 backdrop-blur-md px-3 py-2 rounded-2xl shadow-lg pointer-events-auto text-xs text-blue-200">
                  <div>🚶 <span className="font-bold text-blue-300">{simSpeed.toFixed(1)} m/s</span></div>
                  {waypoints.length>0&&<div>Leg <span className="font-bold">{Math.min(currentLeg+1,waypoints.length)}/{waypoints.length}</span></div>}
                </div>
              )}
            </div>

            <div className="flex flex-col gap-2 items-end">
              <button onClick={()=>setLanguage(l=>l==='vi'?'en':'vi')}
                className="bg-white/90 backdrop-blur-md px-4 py-2 rounded-2xl shadow-lg pointer-events-auto font-semibold text-gray-800 hover:bg-gray-50">
                {language==='vi'?'🇻🇳 VN':'🇬🇧 EN'}
              </button>
              <button onClick={()=>setHeadingUp(h=>!h)}
                className={`bg-white/90 backdrop-blur-md p-2.5 rounded-2xl shadow-lg pointer-events-auto ${headingUp?'text-blue-600':'text-gray-500'}`}>
                {headingUp?<Navigation2 size={20}/>:<Compass size={20}/>}
              </button>
              {headingUp&&(
                <div className="bg-white/90 backdrop-blur-md px-3 py-1.5 rounded-2xl shadow-lg pointer-events-auto flex items-center gap-1.5">
                  <Navigation2 size={14} className="text-blue-500" style={{transform:`rotate(${bearing}deg)`}}/>
                  <span className="text-xs font-mono font-bold text-gray-700">{Math.round(bearing)}°</span>
                </div>
              )}
              {isOffline&&(
                <div className="bg-orange-500 text-white px-3 py-1 rounded-full text-xs font-bold shadow-lg pointer-events-auto">
                  {language==='vi'?'NGOẠI TUYẾN':'OFFLINE'}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Simulation Sidebar */}
        {isSimulating && (
          <SimulationSidebar
            language={language}
            speed={simSpeed}
            onSpeedChange={setSimSpeed}
            waypoints={waypoints}
            onClearWaypoints={()=>{ setWaypoints([]); setCurrentLeg(0); simLegRef.current=0; }}
            onRemoveWaypoint={id=>setWaypoints(p=>p.filter(w=>w.id!==id))}
            isPickingWaypoints={pickingWaypoints}
            onTogglePicking={()=>setPickingWaypoints(v=>!v)}
            currentLeg={currentLeg}
            totalDistance={totalDist}
          />
        )}
      </div>

      {error&&(
        <div className="absolute top-20 left-4 right-4 z-[1000] bg-red-100 border border-red-200 text-red-700 px-4 py-3 rounded-xl shadow-sm text-sm">
          {error}
        </div>
      )}

      {/* ── Approach / Core Toast ── */}
      {approachToast&&(
        <div style={{
          position:'absolute', top:isSimulating?80:72, left:'50%',
          transform:'translateX(-50%)', zIndex:1800,
          background: approachToast.mode==='CORE'
            ? 'linear-gradient(135deg,#065f46,#059669)'
            : 'linear-gradient(135deg,#1e40af,#2563eb)',
          color:'#fff', borderRadius:16, padding:'10px 16px',
          boxShadow:'0 8px 24px rgba(0,0,0,.25)',
          display:'flex', alignItems:'center', gap:10,
          maxWidth:280, animation:'slideDown .25s ease',
          whiteSpace:'nowrap',
        }}>
          <span style={{fontSize:20}}>
            {approachToast.mode==='CORE'?'📍':'🔔'}
          </span>
          <div>
            <p style={{margin:0,fontWeight:700,fontSize:13}}>
              {approachToast.mode==='CORE'
                ?(language==='vi'?'Bạn đã đến nơi!':'You\'ve arrived!')
                :(language==='vi'?'Đang đến gần điểm:':'Approaching:')
              }
            </p>
            <p style={{margin:0,fontSize:12,opacity:.85}}>
              {approachToast.poi.name[language]}
            </p>
          </div>
        </div>
      )}

      <NarrationBanner
        poi={playingPoi}
        mode={bannerMode}
        language={language}
        userLocation={location}
        onClose={()=>{ setPlayingPoi(null); audioRef.current.stop(); stopNarration(); }}
        onReplay={handleReplay}
      />

      <BottomPanel
        isTracking={isTracking}
        onStart={startTracking}
        onStop={stopTracking}
        playingPoi={playingPoi}
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
        onDownloadData={()=>{ if(pois.length>0){localStorage.setItem(OFFLINE_POIS_KEY,JSON.stringify(pois));setHasDownloadedData(true);}}}
        onClearData={()=>{ localStorage.removeItem(OFFLINE_POIS_KEY);setHasDownloadedData(false);setIsOffline(false); }}
      />
    </div>
  );
}