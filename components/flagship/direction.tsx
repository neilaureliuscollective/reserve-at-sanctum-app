"use client";
import { useState } from "react";
import { Compass, Activity, HeartPulse } from "lucide-react";
import { Action } from "./action";
import styles from "./flagship.module.css";
const directions = [
 {name:"Presence",icon:Compass,title:"Show up with intention.",copy:"Build a personal routine around grooming, preparation and the way you carry yourself.",href:"/pathways?priority=presence",action:"Build your presence routine",detail:"YOUR DAILY STANDARD"},
 {name:"Performance",icon:Activity,title:"Give discipline a direction.",copy:"Choose a focused routine for movement and performance. Keep your next step within reach.",href:"/pathways?priority=performance",action:"Build your performance routine",detail:"PURPOSE IN PRACTICE"},
 {name:"Vitalis",icon:HeartPulse,title:"Keep a rhythm worth returning to.",copy:"Start the free wellness pilot with sleep consistency, everyday movement or meal preparation.",href:"/vitalis/journey",action:"Start your free wellness rhythm",detail:"FREE WELLNESS PILOT"},
];
export function Direction() {
 const [active,setActive]=useState(0);const direction=directions[active];const Icon=direction.icon;
 return <div className={styles.direction}>
  <noscript><nav aria-label="Your Reserve directions without JavaScript">{directions.map(item=><Action key={item.name} href={item.href} secondary>{item.name}</Action>)}</nav></noscript>
  <div className={styles.directionControls} data-lr-directions role="group" aria-label="Choose your Reserve direction">{directions.map((item,index)=><button key={item.name} type="button" aria-pressed={active===index} onClick={()=>setActive(index)}>{item.name}</button>)}</div>
  <div className={styles.directionResult} aria-live="polite" aria-atomic="true"><Icon size={32} strokeWidth={1.3} aria-hidden="true"/><p className={styles.eyebrow}>{direction.detail}</p><h3>{direction.title}</h3><p>{direction.copy}</p><Action href={direction.href}>{direction.action}</Action></div>
  <p className={styles.previewNote}>Explore a direction here. Your personal routines stay inside your account.</p>
 </div>;
}
