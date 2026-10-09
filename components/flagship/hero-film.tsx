"use client";
import { useEffect, useRef, useState } from "react";
import { Pause, Play, RotateCcw } from "lucide-react";
import styles from "./flagship.module.css";

export function HeroFilm() {
 const video=useRef<HTMLVideoElement>(null);
 const [state,setState]=useState<"poster"|"playing"|"paused"|"ended">("poster");
 const [still,setStill]=useState(false);
 useEffect(()=>{
  const element=video.current;if(!element)return;
  const media=matchMedia('(prefers-reduced-motion: reduce)');
  const connection=(navigator as Navigator & {connection?:{saveData?:boolean}}).connection;
  let started=false;
  const apply=()=>{
   const disabled=media.matches||document.documentElement.dataset.reserveStill==='true';setStill(disabled);
   if(disabled){element.pause();setState('poster');}
   else if(!started && !connection?.saveData){started=true;element.src='/films/imperial-core.mp4';element.play().catch(()=>setState('poster'));}
  };
  const observer=new MutationObserver(apply);observer.observe(document.documentElement,{attributes:true,attributeFilter:['data-reserve-still']});
  media.addEventListener('change',apply);apply();
  const visibility=()=>{if(document.hidden)element.pause();};
  document.addEventListener('visibilitychange',visibility);
  const view=new IntersectionObserver(entries=>{if(!entries[0].isIntersecting)element.pause();});view.observe(element);
  return()=>{element.pause();observer.disconnect();view.disconnect();media.removeEventListener('change',apply);document.removeEventListener('visibilitychange',visibility);};
 },[]);
 const toggle=()=>{
  const element=video.current;if(!element||still)return;
  if(state==='playing')element.pause();
  else {if(!element.getAttribute('src'))element.src='/films/imperial-core.mp4';if(state==='ended')element.currentTime=0;element.play().catch(()=>setState('poster'));}
 };
 const label=still?'Film paused: Still mode':state==='playing'?'Pause hero film':state==='ended'?'Replay hero film':'Play hero film';
 return <div className={styles.film} data-hero-film data-film-state={state}>
  {/* Poster renders independently: no video download is needed for the first view. */}
  <img className={styles.filmPoster} src="/images/flagship/imperial-core.jpg" alt="Illustrative brushed steel sculpture surrounding a deep green stone core" fetchPriority="high" width={1920} height={1080}/>
  <video ref={video} className={styles.filmVideo} muted playsInline preload="none" aria-hidden="true" tabIndex={-1} data-visible={!still && state!=='poster'} onPlaying={()=>setState('playing')} onPause={()=>setState(current=>current==='poster'?'poster':'paused')} onEnded={()=>setState('ended')} onError={()=>setState('poster')}/>
  <div className={styles.filmControls}><span>AI-GENERATED BRAND CONCEPT</span><button type="button" onClick={toggle} disabled={still} aria-label={label}>{state==='playing'?<Pause size={15}/>:state==='ended'?<RotateCcw size={15}/>:<Play size={15}/>}<span>{still?'Still':state==='playing'?'Pause':state==='ended'?'Replay':'Play'}</span></button></div>
 </div>;
}
