"use client";
import { useEffect } from "react";

/** Progressive enhancement: server content stays visible until observation is ready. */
export function ArrivalMotion() {
 useEffect(() => {
  const main=document.querySelector<HTMLElement>('main[data-lr-flagship]');
  if(!main || !('IntersectionObserver' in window))return;
  const media=matchMedia('(prefers-reduced-motion: reduce)');
  const selectors=['[aria-label="The Reserve standard"] > div','#pathways > div','#the-collection > header','#the-collection > div','[aria-labelledby="philosophy-title"] > div','[aria-labelledby="philosophy-title"] > figure','[aria-labelledby="wellness-title"] > div','[aria-labelledby="membership-title"] > div'];
  const elements=selectors.flatMap(selector=>Array.from(main.querySelectorAll<HTMLElement>(selector)));
  const footer=main.parentElement?.querySelector<HTMLElement>('footer');
  if(footer)elements.push(footer);
  const still=()=>media.matches || document.documentElement.dataset.reserveStill==='true';
  const settle=(element:HTMLElement)=>{element.dataset.lrArrival='settled';observer.unobserve(element);};
  const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
   if(entry.isIntersecting) {
    const element=entry.target as HTMLElement;
    // Deep jumps skip choreography; ordinary approaches play once.
    element.dataset.lrArrival=entry.boundingClientRect.top<innerHeight*.35 || still()?'settled':'arriving';
    observer.unobserve(element);
   }
  }),{threshold:0,rootMargin:'0px 0px -8% 0px'});
  elements.forEach((element,index)=>{
   element.dataset.lrBeat=String(index%3);
   if(still() || element.getBoundingClientRect().top<innerHeight*.92)element.dataset.lrArrival='settled';
   else {element.dataset.lrArrival='waiting';observer.observe(element);}
  });
  const finish=()=>{if(still())elements.forEach(settle);};
  const focus=(event:FocusEvent)=>{const target=event.target as HTMLElement;elements.filter(el=>el.contains(target)).forEach(settle);};
  const anchor=()=>{if(location.hash){const target=document.getElementById(location.hash.slice(1));elements.filter(el=>el===target || target?.contains(el) || el.contains(target)).forEach(settle);}};
  const mutation=new MutationObserver(finish);mutation.observe(document.documentElement,{attributes:true,attributeFilter:['data-reserve-still']});
  media.addEventListener('change',finish);document.addEventListener('focusin',focus);window.addEventListener('hashchange',anchor);anchor();
  main.dataset.lrMotion='ready';
  return ()=>{observer.disconnect();mutation.disconnect();media.removeEventListener('change',finish);document.removeEventListener('focusin',focus);window.removeEventListener('hashchange',anchor);elements.forEach(el=>{delete el.dataset.lrArrival;delete el.dataset.lrBeat;});delete main.dataset.lrMotion;};
 },[]);
 return null;
}
