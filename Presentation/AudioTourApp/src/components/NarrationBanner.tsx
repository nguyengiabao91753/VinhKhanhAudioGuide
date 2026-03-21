/**
 * NarrationBanner v3
 * - auto   : compact strip, closes when poi cleared
 * - manual : full video-style panel, stays open, shows distance + replay
 */
import { useEffect, useState, useRef, useCallback } from 'react';
import { AudioTierEngine, type AudioTierState } from '../features/audio/lib/AudioTierEngine';
import type { POI } from '../types';
import { Play, Pause, RotateCcw, X, Volume2, MapPin, Navigation } from 'lucide-react';

export type BannerMode = 'auto' | 'manual';

interface Props {
  poi: POI | null;
  mode: BannerMode;
  language: 'vi' | 'en';
  userLocation?: { lat: number; lng: number } | null;
  onClose: () => void;
  onReplay: (poi: POI) => void;
}

function haversineMeter(la1:number,ln1:number,la2:number,ln2:number){
  const R=6371000,d2r=Math.PI/180;
  const dLa=(la2-la1)*d2r,dLn=(ln2-ln1)*d2r;
  const a=Math.sin(dLa/2)**2+Math.cos(la1*d2r)*Math.cos(la2*d2r)*Math.sin(dLn/2)**2;
  return R*2*Math.atan2(Math.sqrt(a),Math.sqrt(1-a));
}
function fmtDist(m:number,lang:string){
  return m<1000?`${Math.round(m)} m`:`${(m/1000).toFixed(1)} km`;
}

let eqInj=false;
function injectEq(){
  if(eqInj)return;eqInj=true;
  const s=document.createElement('style');
  s.textContent=`
    @keyframes eq-b{0%,100%{transform:scaleY(.35)}50%{transform:scaleY(1)}}
    @keyframes bnr-in{from{transform:translateY(100%);opacity:0}to{transform:translateY(0);opacity:1}}
    .bnr-slide{animation:bnr-in .28s cubic-bezier(.34,1.56,.64,1) both}
  `;
  document.head.appendChild(s);
}

function EqBar({active,color='#10b981'}:{active:boolean;color?:string}){
  if(!active)return null;
  return(
    <span style={{display:'flex',gap:2,alignItems:'flex-end',height:18}}>
      {[5,10,7,14,8,12,6].map((h,i)=>(
        <span key={i} style={{
          width:3,height:h,background:color,borderRadius:99,
          animation:`eq-b .6s ease-in-out infinite`,
          animationDelay:`${i*.07}s`,
        }}/>
      ))}
    </span>
  );
}

function Ring({progress,size=52,stroke=3,color='#10b981'}:{progress:number;size?:number;stroke?:number;color?:string}){
  const r=(size-stroke*2)/2,c=2*Math.PI*r;
  return(
    <svg width={size} height={size} style={{position:'absolute',top:0,left:0,transform:'rotate(-90deg)'}}>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(0,0,0,.08)" strokeWidth={stroke}/>
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={stroke}
        strokeDasharray={c} strokeDashoffset={c*(1-Math.min(progress,1))}
        strokeLinecap="round" style={{transition:'stroke-dashoffset .4s linear'}}/>
    </svg>
  );
}

export default function NarrationBanner({poi,mode,language,userLocation,onClose,onReplay}:Props){
  injectEq();
  const [as,setAs]=useState<AudioTierState|null>(null);
  const [visible,setVisible]=useState(false);
  const eng=useRef(AudioTierEngine.getInstance());

  useEffect(()=>{const u=eng.current.subscribe(setAs);return u;},[]);
  useEffect(()=>{if(poi)setVisible(true);},[poi]);
  useEffect(()=>{if(mode==='auto'&&!poi)setVisible(false);},[mode,poi]);

  const isPlay=as?.isPlaying??false;
  const isPause=as?.isPaused??false;
  const prog=as?.progress??0;
  const ended=!isPlay&&!isPause&&prog>0.01;
  const dist=(userLocation&&poi)?haversineMeter(userLocation.lat,userLocation.lng,poi.lat,poi.lng):null;

  const close=useCallback(()=>{eng.current.stop();setVisible(false);onClose();},[onClose]);
  const replay=useCallback(()=>{if(poi)onReplay(poi);},[poi,onReplay]);

  if(!visible||!poi)return null;

  const statusText=isPause
    ?(language==='vi'?'Đang tạm dừng':'Paused')
    :isPlay
    ?(language==='vi'?'Đang phát...':'Playing...')
    :ended
    ?(language==='vi'?'Đã phát xong':'Finished')
    :(language==='vi'?'Sẵn sàng':'Ready');

  // ── MANUAL ────────────────────────────────────────────────────────────
  if(mode==='manual'){
    return(
      <div className="bnr-slide" style={{
        background:'#fff',borderTop:'1px solid #f0f0f0',
        boxShadow:'0 -8px 40px rgba(0,0,0,.14)',zIndex:2000,
        position:'relative',display:'flex',flexDirection:'column',
        maxHeight:'72vh',overflow:'hidden',
      }}>
        {/* Hero */}
        <div style={{position:'relative',flexShrink:0}}>
          {poi.imageUrl?(
            <img src={poi.imageUrl} alt={poi.name[language]}
              style={{width:'100%',height:155,objectFit:'cover',display:'block'}}/>
          ):(
            <div style={{height:100,background:'linear-gradient(135deg,#ecfdf5,#d1fae5)',
              display:'flex',alignItems:'center',justifyContent:'center'}}>
              <MapPin size={42} color="#10b981"/>
            </div>
          )}
          <div style={{position:'absolute',inset:0,
            background:'linear-gradient(to top,rgba(0,0,0,.7) 0%,rgba(0,0,0,.1) 55%,transparent 100%)'}}/>
          {/* Title overlay */}
          <div style={{position:'absolute',bottom:12,left:14,right:46}}>
            <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:3}}>
              <EqBar active={isPlay} color="#34d399"/>
              {ended&&<span style={{fontSize:11,color:'#a7f3d0',fontWeight:700}}>
                {language==='vi'?'✓ Đã phát xong':'✓ Finished'}
              </span>}
            </div>
            <p style={{color:'#fff',fontWeight:800,fontSize:17,margin:0,lineHeight:1.25,
              textShadow:'0 1px 6px rgba(0,0,0,.6)'}}>
              {poi.name[language]}
            </p>
            {dist!==null&&(
              <div style={{display:'flex',alignItems:'center',gap:4,marginTop:5}}>
                <Navigation size={12} color="#86efac"/>
                <span style={{fontSize:12,color:'#86efac',fontWeight:600}}>
                  {fmtDist(dist,language)}&nbsp;{language==='vi'?'từ vị trí của bạn':'from you'}
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

        {/* Description */}
        <div style={{padding:'12px 16px 6px',overflowY:'auto',flex:1}}>
          <p style={{fontSize:13.5,color:'#374151',lineHeight:1.65,margin:0}}>
            {poi.description[language]}
          </p>
        </div>

        {/* Controls */}
        <div style={{padding:'10px 14px 16px',borderTop:'1px solid #f3f4f6',
          display:'flex',gap:10,alignItems:'center',flexShrink:0,background:'#fafafa'}}>
          {/* Ring + play/pause */}
          <div style={{position:'relative',width:52,height:52,flexShrink:0}}>
            <Ring progress={prog} size={52} stroke={3}/>
            <button
              onClick={()=>isPause?eng.current.resume():eng.current.pause()}
              disabled={ended}
              style={{
                position:'absolute',inset:4,borderRadius:'50%',
                background:ended?'#e5e7eb':'#10b981',
                border:'none',cursor:ended?'default':'pointer',
                display:'flex',alignItems:'center',justifyContent:'center',
                color:ended?'#9ca3af':'#fff',transition:'all .15s',
              }}>
              {isPause?<Play size={18}/>:<Pause size={18}/>}
            </button>
          </div>
          {/* Status */}
          <div style={{flex:1,minWidth:0}}>
            <p style={{margin:0,fontSize:13,fontWeight:700,color:'#111827'}}>{statusText}</p>
            <p style={{margin:0,fontSize:11,color:'#9ca3af'}}>
              {Math.round(prog*100)}%{as?.tier===3?' · TTS':''}
            </p>
          </div>
          {/* Replay */}
          <button onClick={replay} style={{
            height:40,paddingInline:14,borderRadius:12,
            background:'#f0fdf4',border:'1.5px solid #bbf7d0',
            color:'#065f46',fontWeight:700,fontSize:13,
            display:'flex',alignItems:'center',gap:6,
            cursor:'pointer',flexShrink:0}}>
            <RotateCcw size={14}/>
            {language==='vi'?'Phát lại':'Replay'}
          </button>
          <button onClick={close} style={{
            height:40,paddingInline:14,borderRadius:12,
            background:'#f3f4f6',border:'none',
            color:'#374151',fontWeight:600,fontSize:13,
            cursor:'pointer',flexShrink:0}}>
            {language==='vi'?'Đóng':'Close'}
          </button>
        </div>
      </div>
    );
  }

  // ── AUTO compact ──────────────────────────────────────────────────────
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
          {poi.imageUrl
            ?<img src={poi.imageUrl} alt="" style={{width:'100%',height:'100%',objectFit:'cover'}}/>
            :<div style={{width:'100%',height:'100%',display:'flex',alignItems:'center',
              justifyContent:'center'}}><Volume2 size={20} color="#10b981"/></div>
          }
        </div>
        <div style={{flex:1,minWidth:0}}>
          <div style={{display:'flex',alignItems:'center',gap:6,marginBottom:2}}>
            <EqBar active={isPlay}/>
            <p style={{margin:0,fontWeight:700,fontSize:13,color:'#111',
              overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>
              {poi.name[language]}
            </p>
          </div>
          <p style={{margin:0,fontSize:11,color:'#6b7280'}}>
            {statusText}
            {dist!==null&&<span style={{marginLeft:6}}>· {fmtDist(dist,language)}</span>}
          </p>
        </div>
        <div style={{display:'flex',gap:6,flexShrink:0}}>
          <button onClick={()=>isPause?eng.current.resume():eng.current.pause()}
            style={{width:34,height:34,borderRadius:'50%',background:'#ecfdf5',
              border:'none',cursor:'pointer',display:'flex',alignItems:'center',
              justifyContent:'center',color:'#059669'}}>
            {isPause?<Play size={15}/>:<Pause size={15}/>}
          </button>
          <button onClick={replay}
            title={language==='vi'?'Phát lại':'Replay'}
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