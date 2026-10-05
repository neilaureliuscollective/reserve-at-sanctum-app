'use client';
import Link from 'next/link';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { CalendarDays, Check, CircleDot, ClipboardList, Clock3, MessageCircle, Plus, RefreshCw, ShieldCheck, ArrowUpRight } from 'lucide-react';
import type { WorkspaceItem, DayVisit } from '@/lib/command-center';
import { Visits } from './visits';
import { StudioBlocks } from './studio-blocks';
import { ChairStudio } from './chair-studio';
import { ReserveTalk } from './reserve-talk';
import { BusinessKnowledge } from './business-knowledge';
import type { Actor } from '@/lib/booking';
import styles from './operator-workspace.module.css';
type Tab='today'|'schedule'|'work'|'talk'|'knowledge';
type Data={asOf:string;selectedDay:string;day:DayVisit[];dayTruncated:boolean;items:WorkspaceItem[];workspaceReady:boolean;hasMore:boolean;offset:number;pulse:{today:number;nextSevenDays:number;openBuild:number;needsReview:number;nextVisit:DayVisit|null}};
const tabs=[{id:'today',label:'Today',icon:CircleDot},{id:'schedule',label:'Schedule',icon:CalendarDays},{id:'work',label:'Work',icon:ClipboardList},{id:'talk',label:'Talk',icon:MessageCircle},{id:'knowledge',label:'Knowledge',icon:ShieldCheck}] as const;
const statuses={captured:'Captured',building:'In progress',review:'Needs review',approved:'Direction approved'};
const nextStatus={captured:'building',building:'review',review:'approved',approved:'captured'} as const;
const time=(value:string)=>new Intl.DateTimeFormat('en-US',{timeZone:'America/Chicago',hour:'numeric',minute:'2-digit'}).format(new Date(value));
export function OperatorWorkspace({actor,preview,initialTab='today',initialDate=''}:{actor:Actor;preview:boolean;initialTab?:string;initialDate?:string}){
  const [tab,setTab]=useState<Tab>(tabs.some(t=>t.id===initialTab)?initialTab as Tab:'today'),[date,setDate]=useState(initialDate),[offset,setOffset]=useState(0);
  const [data,setData]=useState<Data|null>(null),[error,setError]=useState(''),[busy,setBusy]=useState(''),[compose,setCompose]=useState(false),[filter,setFilter]=useState('all'),[prompt,setPrompt]=useState('');
  const [colleagues,setColleagues]=useState<{id:string;name:string}[]>([]),[notice,setNotice]=useState('');
  const generation=useRef(0);
  const owner=actor.role==='owner';
  const refresh=useCallback(async()=>{
    const gen=++generation.current;
    try{
      const params=new URLSearchParams({offset:String(offset)});if(date)params.set('date',date);
      const response=await fetch('/api/studio/command?'+params,{cache:'no-store'}),payload=await response.json();
      if(!response.ok)throw new Error(payload.error||'Could not refresh your workspace.');
      if(gen===generation.current){setData(payload);setError('');}
    }catch(e){if(gen===generation.current)setError(e instanceof Error?e.message:'Connection unavailable.');}
  },[date,offset]);
  useEffect(()=>{
    void refresh();const timer=window.setInterval(()=>{if(document.visibilityState==='visible')void refresh();},45000);
    const focus=()=>{if(document.visibilityState==='visible')void refresh();};document.addEventListener('visibilitychange',focus);
    return()=>{window.clearInterval(timer);document.removeEventListener('visibilitychange',focus);generation.current++;};
  },[refresh]);
  useEffect(()=>{void fetch('/api/studio/conversations',{cache:'no-store'}).then(async r=>{if(r.ok)setColleagues((await r.json()).colleagues);}).catch(()=>{});},[]);
  function navigate(next:Tab){setTab(next);const url=new URL(window.location.href);url.searchParams.set('tab',next);window.history.replaceState(null,'',url);}
  function ask(value:string){setPrompt(value);navigate('talk');}
  async function capture(event:FormEvent<HTMLFormElement>){
    event.preventDefault();const form=event.currentTarget,values=new FormData(form);setBusy('create');setNotice('');
    try{
      const response=await fetch('/api/studio/command',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind:values.get('kind'),lane:values.get('lane'),title:values.get('title'),detail:values.get('detail'),assignee:values.get('assignee'),visibility:values.get('visibility'),due_date:values.get('due_date')||null})}),payload=await response.json();
      if(!response.ok)throw new Error(payload.error||'Could not capture this work.');
      form.reset();setCompose(false);setOffset(0);setNotice('Saved. This is recorded work, not a deployed change.');await refresh();
    }catch(e){setError(e instanceof Error?e.message:'Could not save.');}finally{setBusy('');}
  }
  async function update(item:WorkspaceItem,changes:Record<string,unknown>){
    setBusy(item.id);setNotice('');
    try{const response=await fetch('/api/studio/command',{method:'PATCH',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:item.id,revision:item.revision,...changes})}),payload=await response.json();if(!response.ok)throw new Error(payload.error||'Could not update this work.');setNotice('Saved.');await refresh();}catch(e){setError(e instanceof Error?e.message:'Could not save.');}finally{setBusy('');}
  }
  const canChair=owner||actor.provider_id==='katie';
  const visible=data?.items.filter(item=>filter==='all'||filter==='review'?filter!=='review'||item.status==='review':filter==='handoffs'?item.handoff_to===actor.id&&item.handoff_state!=='done':item.lane===filter)||[];
  function visitLine(visit:DayVisit){return <article className={styles.dayVisit} key={visit.id}><time>{time(visit.starts_at)}</time><div><strong>{visit.client_name}</strong><p>{visit.service_name} · {time(visit.ends_at)} end</p><small>{visit.status} · REF {visit.id.slice(0,8).toUpperCase()}</small></div>{canChair?<button className={styles.textButton} onClick={()=>navigate('schedule')}>Prepare <ArrowUpRight size={14}/></button>:null}</article>;}
  return <main id="main" className={styles.workspace} data-workspace={owner?'founder':'provider'}>
    <aside className={styles.rail}><Link href="/home?explore=1" className={styles.railBrand}><img src="/brand/reserve-rs-v1/rs-gold.svg" width="44" height="44" alt="Reserve"/><span>THE RESERVE<small>PRIVATE OPERATIONS</small></span></Link>
      <nav aria-label="Command destinations">{tabs.map(t=><button key={t.id} onClick={()=>navigate(t.id)} aria-current={tab===t.id?'page':undefined}><t.icon size={18}/><span>{t.label}</span></button>)}</nav>
      <div className={styles.railFoot}><p>{owner?'Reserve Command':'Fix It Shop — Studio'}</p><small>{actor.name.split(' ·')[0]}</small><Link href="/setup?help=1">Install + account help</Link></div>
    </aside>
    <div className={styles.world}>
      <header className={styles.topbar}><div><p className={styles.eyebrow}>{owner?'RESERVE COMMAND':'FIX IT SHOP · STUDIO'}</p><span>{owner?'Founder workspace':'Your working day'}</span></div><div className={styles.topActions}><button onClick={()=>void refresh()} aria-label="Refresh workspace"><RefreshCw size={17}/></button><Link href="/home?explore=1">Enter Reserve <ArrowUpRight size={15}/></Link></div></header>
      {preview?<div className={styles.preview}>Local preview · synthetic records only</div>:null}
      {tab!=='talk'&&error?<div className={styles.error} role="alert">{error}{data?' Showing the last successful snapshot.':''}</div>:null}
      {tab==='today'?<section className={styles.content}>
        <header className={styles.arrival}><p className={styles.eyebrow}>{data?new Date(data.selectedDay+'T12:00:00-05:00').toLocaleDateString('en-US',{timeZone:'America/Chicago',weekday:'long',month:'long',day:'numeric'}):'YOUR DAY, TOGETHER'}</p><h1>{actor.name.split(' ')[0].split(' ·')[0]},<br/>{owner?'keep the Reserve moving.':'make every visit count.'}</h1><p>{owner?'The whole operation. The decisions that matter. The next move.':'Your schedule, your clients, and the space to do your best work.'}</p></header>
        <div className={styles.openingBrief}><div><span className={styles.orb} aria-hidden="true"/><p><strong>Aethelios · Opening brief</strong><small>Put today’s permitted records into perspective.</small></p></div><button className={styles.primary} onClick={()=>ask('Give me today’s opening brief. Read the schedule and work first; identify the next three useful actions.')}>Brief me <ArrowUpRight size={16}/></button></div>
        <div className={styles.pulse} aria-label="Business pulse"><div><strong>{data?.pulse.today??'—'}</strong><small>Confirmed today</small></div><div><strong>{data?.pulse.nextSevenDays??'—'}</strong><small>Next 7 days</small></div><div><strong>{data?.workspaceReady?data.pulse.openBuild:'—'}</strong><small>Open work</small></div><div><strong>{data?.workspaceReady?data.pulse.needsReview:'—'}</strong><small>Needs review</small></div></div>
        <div className={styles.todayColumns}><section><div className={styles.sectionHeading}><h2>Next in the Reserve</h2><button onClick={()=>navigate('schedule')}>Open schedule <ArrowUpRight size={14}/></button></div>{!data?<p>Opening the appointment book…</p>:data.pulse.nextVisit?visitLine(data.pulse.nextVisit):<p className={styles.empty}>No active or upcoming appointment in your permitted schedule.</p>}<p className={styles.freshness}>{data?'Updated '+time(data.asOf)+' CT':'Awaiting connection'} · America/Chicago</p></section>
        <section><div className={styles.sectionHeading}><h2>Needs attention</h2><button onClick={()=>navigate('work')}>Open work <ArrowUpRight size={14}/></button></div>{data?.items.filter(w=>!w.completed_at).slice(0,3).map(w=><button className={styles.attention} key={w.id} onClick={()=>navigate('work')}><span>{w.kind} · {w.handoff_to===actor.id?'Waiting on you':statuses[w.status]}</span><strong>{w.title}</strong><ArrowUpRight size={16}/></button>)}{data?.workspaceReady&&data.pulse.openBuild===0?<p className={styles.empty}>Nothing waiting. Capture the next decision when it arrives.</p>:null}{data&&!data.workspaceReady?<p className={styles.notice}>Shared work awaits its database activation. Scheduling remains available.</p>:null}</section></div>
        <div className={styles.operatingStatus}><ShieldCheck size={18}/><p><strong>Commerce activation comes next.</strong><span>Product stock, collected revenue and provider earnings need verified receipts. Booking quotes stay separate.</span></p></div>
      </section>:null}
      {tab==='schedule'?<section className={styles.content} id="schedule"><div className={styles.sectionHeading}><div><p className={styles.eyebrow}>{owner?'RESERVE APPOINTMENT BOOK':'KATIE’S APPOINTMENT BOOK'}</p><h2>Time, well placed.</h2></div><label>Day<input type="date" value={date||data?.selectedDay||''} onChange={e=>{setDate(e.target.value);setOffset(0);}}/></label></div>{!data?<p>Opening your day…</p>:data.day.length?data.day.map(visitLine):<p className={styles.empty}>No recorded visits on this day.</p>}{data?.dayTruncated?<p className={styles.notice}>This day has more records than the current view can display. Use the appointment book below.</p>:null}
        <details className={styles.nativeTools}><summary>Manage appointments</summary><Visits actor={actor} studio preview={preview}/></details>
        {canChair?<><section id="availability"><StudioBlocks/></section><ChairStudio/></>:null}
      </section>:null}
      {tab==='work'?<section className={styles.content}><div className={styles.sectionHeading}><div><p className={styles.eyebrow}>OPERATIONS · DECISIONS · HANDOFFS</p><h2>Move it forward.</h2></div><button className={styles.primary} onClick={()=>setCompose(v=>!v)} disabled={!data?.workspaceReady}><Plus size={17}/>{compose?'Close':'Capture work'}</button></div>
        {!data?.workspaceReady?<p className={styles.notice}>Work becomes available after its database activation.</p>:null}
        {compose?<form className={styles.workForm} onSubmit={capture}><div className={styles.formRow}><label>Type<select name="kind"><option value="task">Task</option><option value="idea">Idea</option><option value="feedback">Feedback</option><option value="decision">Decision</option></select></label><label>Lane<select name="lane" defaultValue={owner?'reserve':'fix-it'}><option value="reserve">Reserve</option><option value="fix-it">Fix It Shop</option><option value="gent">Gent Ascend</option></select></label><label>Owner<select name="assignee" defaultValue={owner?'neil':'katie'}><option value="neil">Neil</option><option value="katie">Katie</option><option value="both">Both</option></select></label></div><label>Visibility<select name="visibility"><option value="shared">Shared with Reserve operators</option>{owner?<option value="founder">Founder only</option>:<option value="provider">Assigned provider operations</option>}</select></label><label>Headline<input name="title" maxLength={90} required/></label><label>Business detail<textarea name="detail" rows={3} maxLength={600}/></label><label>Due date (optional)<input name="due_date" type="date"/></label><small>Keep private client information in its native workspace.</small><button className={styles.primary} disabled={busy==='create'}>Save work</button></form>:null}
        <div className={styles.filters}>{[['all','All'],['review','Review'],['handoffs','My handoffs'],['reserve','Reserve'],['fix-it','Fix It'],['gent','Gent']].map(([value,label])=><button key={value} onClick={()=>setFilter(value)} aria-pressed={filter===value}>{label}</button>)}</div>
        {visible.map(item=><article className={styles.workItem} key={item.id}><div className={styles.workMeta}><span>{item.lane} · {item.kind}</span><span>{item.visibility==='shared'?'Shared':item.visibility==='founder'?'Founder only':'Provider operations'}</span></div><h3>{item.title}</h3>{item.detail?<p>{item.detail}</p>:null}<div className={styles.workMeta}><span>{item.completed_at?'Completed':statuses[item.status]} · {item.assignee==='both'?'Neil + Katie':item.assignee}</span>{item.due_date?<span>Due {String(item.due_date).slice(0,10)}</span>:null}</div>{item.handoff_to?<p className={styles.handoff}><ArrowUpRight size={15}/>{item.handoff_to===actor.id?'Handoff to you':`Handoff to ${colleagues.find(c=>c.id===item.handoff_to)?.name.split(' ·')[0]||'operator'}`} · {item.handoff_state}</p>:null}
          <div className={styles.workActions}><button onClick={()=>void update(item,{status:nextStatus[item.status]})} disabled={busy===item.id||Boolean(item.completed_at)}>{item.status==='review'?'Approve direction':item.status==='approved'?'Reopen direction':item.status==='captured'?'Start work':'Send to review'}</button><button onClick={()=>void update(item,{completed:!item.completed_at})} disabled={busy===item.id}><Check size={15}/>{item.completed_at?'Reopen work':'Mark complete'}</button>{item.handoff_to===actor.id&&item.handoff_state==='proposed'?<button onClick={()=>void update(item,{acknowledge:true})} disabled={busy===item.id}>Acknowledge handoff</button>:null}
          {item.visibility==='shared'&&colleagues.length?<label>Hand off<select aria-label={'Hand off '+item.title} value="" disabled={busy===item.id} onChange={e=>{if(e.target.value)void update(item,{handoff_to:e.target.value});}}><option value="">Choose operator</option>{colleagues.map(c=><option key={c.id} value={c.id}>{c.name.split(' ·')[0]}</option>)}</select></label>:null}</div><small className={styles.freshness}>Revision {item.revision} · updated by {item.updater_name?.split(' ·')[0]}</small></article>)}
        {data?.workspaceReady&&visible.length===0?<p className={styles.empty}>No work in this view.</p>:null}<div className={styles.pagination}><button className={styles.secondary} disabled={offset===0} onClick={()=>setOffset(v=>Math.max(0,v-50))}>Previous</button><span>Page {Math.floor(offset/50)+1}</span><button className={styles.secondary} disabled={!data?.hasMore} onClick={()=>setOffset(v=>v+50)}>Next</button></div>{notice?<p role="status">{notice}</p>:null}<small className={styles.muted}>Approving direction records a decision. It does not build or deploy software.</small>
      </section>:null}
      {tab==='talk'?<ReserveTalk initialPrompt={prompt} onUsed={()=>setPrompt('')}/>:null}
      {tab==='knowledge'?<BusinessKnowledge/>:null}
    </div>
  </main>;
}
