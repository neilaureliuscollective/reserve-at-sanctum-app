'use client';
import { useCallback, useEffect, useState, type FormEvent } from 'react';
import type { BusinessFact } from '@/lib/business-knowledge';
import styles from './operator-workspace.module.css';
type Payload={facts:BusinessFact[];services:{id:string;name:string;minutes:number;price:number;provider:string}[];canConfirm:boolean;asOf:string};
export function BusinessKnowledge(){
  const [data,setData]=useState<Payload|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
  const load=useCallback(async()=>{const r=await fetch('/api/studio/knowledge',{cache:'no-store'}),d=await r.json();if(!r.ok)throw new Error(d.error);setData(d);},[]);
  useEffect(()=>{void load().catch(e=>setError(e.message));},[load]);
  async function confirm(event:FormEvent<HTMLFormElement>){
    event.preventDefault();const form=event.currentTarget, fields=new FormData(form);setBusy(true);setError('');
    try{const r=await fetch('/api/studio/knowledge',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({lane:fields.get('lane'),title:fields.get('title'),body:fields.get('body'),source:fields.get('source')})}),d=await r.json();if(!r.ok)throw new Error(d.error);form.reset();await load();}catch(e){setError(e instanceof Error?e.message:'Could not confirm knowledge.');}finally{setBusy(false);}
  }
  async function retire(fact:BusinessFact){setBusy(true);try{const r=await fetch('/api/studio/knowledge',{method:'DELETE',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:fact.id,revision:fact.revision})}),d=await r.json();if(!r.ok)throw new Error(d.error);await load();}catch(e){setError(e instanceof Error?e.message:'Could not retire this fact.');}finally{setBusy(false);}}
  return <section className={styles.content}><p className={styles.eyebrow}>SHARED BUSINESS KNOWLEDGE</p><h2>What we know.<br/>What we stand behind.</h2><p className={styles.muted}>Explicitly confirmed facts help Aethelios work from the same foundation as you and Katie.</p>
    {error?<p className={styles.error} role="alert">{error}</p>:null}
    {!data&&!error?<p>Opening approved knowledge…</p>:null}
    <div className={styles.knowledgeGrid}><div><h3>Service catalog</h3><p className={styles.muted}>Enabled booking quotes. These are not collected payments.</p>{data?.services.length===0?<p>No enabled services are available.</p>:null}{data?.services.map(s=><article className={styles.knowledgeFact} key={s.id}><h4>{s.name}</h4><p>{s.provider} · {s.minutes} min · {(s.price/100).toLocaleString('en-US',{style:'currency',currency:'USD'})} quoted</p></article>)}
    <div className={styles.notice}><strong>Products + money</strong><p>Stock, receipts, earnings and margins appear after the commerce connection is verified.</p></div></div>
    <div><h3>Confirmed facts</h3>{data?.facts.filter(f=>f.active).length===0?<p className={styles.muted}>Nothing confirmed yet. Aethelios will say when business evidence is missing.</p>:null}{data?.facts.filter(f=>f.active).map(f=><article className={styles.knowledgeFact} key={f.id}><small>{f.lane} · Confirmed {new Date(f.confirmed_at).toLocaleDateString()}</small><h4>{f.title}</h4><p>{f.body}</p><small>Source: {f.source}</small>{f.review_at&&new Date(f.review_at)<new Date()?<p>Review overdue · excluded from AI reads</p>:null}{data.canConfirm?<button className={styles.textButton} onClick={()=>void retire(f)} disabled={busy}>Retire this fact</button>:null}</article>)}</div></div>
    {data?.canConfirm?<details className={styles.knowledgeForm}><summary>Confirm a shared business fact</summary><p>Only business knowledge intended for both operators. Private founder or client material belongs outside this collection.</p><form onSubmit={confirm}><label>Lane<select name="lane"><option value="reserve">Reserve</option><option value="fix-it">Fix It Shop</option><option value="gent">Gent Ascend</option></select></label><label>Title<input name="title" required maxLength={120}/></label><label>Approved fact<textarea name="body" required rows={4} maxLength={2000}/></label><label>Source or decision reference<input name="source" required maxLength={500}/></label><button className={styles.primary} disabled={busy}>Confirm and share this fact</button></form></details>:null}
  </section>;
}
