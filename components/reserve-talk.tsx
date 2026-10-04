'use client';
import { useCallback, useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowUp, Copy, Plus, RefreshCw, UsersRound, LockKeyhole, PanelRight } from 'lucide-react';
import type { Room, Turn } from '@/lib/reserve-coworker';
import styles from './operator-workspace.module.css';
type Index={rooms:Room[];colleagues:{id:string;name:string}[];sharedMembers:{id:string;name:string}[];actorId:string;role:string;configuration:{enabled:boolean;configured:boolean}};
type History={room:Room;members:{user_id:string;name:string}[];turns:Turn[];hasMore:boolean};
type WorkingContext={asOf:string;schedule:{date:string;visits:{id:string;starts_at:string;service:string;status:string}[];truncated:boolean};work:{items:{id:string;title:string;status:string;completed:boolean;handoff_state:string}[];truncated:boolean};facts:{services:unknown[];approvedFacts:{title:string;body:string}[];commerce:string}};
async function json<T>(path:string,init?:RequestInit):Promise<T>{
  const response=await fetch(path,{...init,cache:'no-store'}), data=await response.json();
  if(!response.ok)throw new Error(data.error||'This connection is unavailable.');
  return data;
}
const options=(body:unknown,method='POST')=>({method,headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
export function ReserveTalk({initialPrompt='',onUsed}:{initialPrompt?:string;onUsed?:()=>void}){
  const [index,setIndex]=useState<Index|null>(null),[roomId,setRoomId]=useState(''),[history,setHistory]=useState<History|null>(null);
  const [text,setText]=useState(initialPrompt),[error,setError]=useState(''),[busy,setBusy]=useState(false),[threads,setThreads]=useState(false),[copied,setCopied]=useState('');
  const [selectedColleague,setSelectedColleague]=useState('');
  const [context,setContext]=useState<WorkingContext|null>(null),[contextError,setContextError]=useState(''),[contextOpen,setContextOpen]=useState(false);
  const request=useRef<{key:string;room:string;prompt:string}|null>(null), generation=useRef(0), end=useRef<HTMLDivElement>(null);
  const loadIndex=useCallback(async()=>{const data=await json<Index>('/api/studio/conversations');setIndex(data);return data;},[]);
  const loadHistory=useCallback(async(id:string)=>{
    const gen=++generation.current;
    const data=await json<History>('/api/studio/conversations?room='+encodeURIComponent(id));
    if(gen===generation.current)setHistory(current=>{
      if(!current||current.room.id!==id)return data;
      const older=current.turns.filter(t=>!data.turns.some(f=>f.id===t.id)&&data.turns.length&&new Date(t.created_at)<new Date(data.turns[0].created_at));
      return {...data,turns:[...older,...data.turns],hasMore:older.length?current.hasMore:data.hasMore};
    });
    return data;
  },[]);
  useEffect(()=>{let active=true;loadIndex().then(data=>{if(active&&data.rooms.length)setRoomId(data.rooms[0].id);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;generation.current++;};},[loadIndex]);
  useEffect(()=>{
    if(!roomId)return;
    setHistory(null);setError('');
    void loadHistory(roomId).catch(e=>setError(e.message));
    const timer=window.setInterval(()=>{if(document.visibilityState==='visible')void loadHistory(roomId).catch(e=>setError(e.message));},3000);
    return()=>{window.clearInterval(timer);generation.current++;};
  },[roomId,loadHistory]);
  useEffect(()=>{
    if(!roomId)return;let active=true;setContext(null);setContextError('');
    const load=()=>json<WorkingContext>('/api/studio/conversations?room='+roomId+'&context=true').then(data=>{if(active){setContext(data);setContextError('');}}).catch(e=>{if(active)setContextError(e.message);});
    void load();const timer=window.setInterval(()=>{if(document.visibilityState==='visible')void load();},45000);
    return()=>{active=false;window.clearInterval(timer);};
  },[roomId]);
  useEffect(()=>{end.current?.scrollIntoView({block:'nearest'});},[history?.turns.length,history?.turns.at(-1)?.status]);
  const pending=history?.turns.some(t=>t.status==='pending')||false;
  async function create(shared=false){
    setBusy(true);setError('');
    try{
      const colleague=selectedColleague||index?.sharedMembers[0]?.id;
      const {room}=await json<{room:Room}>('/api/studio/conversations',options({title:shared?'Operations Room':'Private working conversation',shared,...(shared?{member_id:colleague}:{})}));
      await loadIndex();setRoomId(room.id);setThreads(false);request.current=null;
    }catch(e){setError(e instanceof Error?e.message:'Could not open the room.');}finally{setBusy(false);}
  }
  async function send(event:FormEvent){
    event.preventDefault();if(!roomId||!text.trim()||pending)return;
    setBusy(true);setError('');const prompt=text.trim();
    // Network retries of an uncertain submission reuse the same request identity.
    if(!request.current||request.current.room!==roomId||request.current.prompt!==prompt)request.current={key:crypto.randomUUID(),room:roomId,prompt};
    try{
      await json('/api/studio/talk',options({conversation_id:roomId,request_key:request.current.key,prompt}));
      setText('');request.current=null;onUsed?.();await loadHistory(roomId);
    }catch(e){setError(e instanceof Error?e.message:'Could not send this message.');}finally{setBusy(false);}
  }
  async function copy(turn:Turn){
    try{await navigator.clipboard.writeText(turn.answer);setCopied(turn.id);}catch{setError('Copy is unavailable on this device. Select the reply text to copy it.');}
  }
  async function earlier(){
    if(!history?.turns.length)return;setBusy(true);
    try{const previous=await json<History>('/api/studio/conversations?room='+roomId+'&before='+encodeURIComponent(history.turns[0].created_at));setHistory(current=>current?{...current,turns:[...previous.turns,...current.turns],hasMore:previous.hasMore}:previous);}catch(e){setError(e instanceof Error?e.message:'Could not read earlier messages.');}finally{setBusy(false);}
  }
  async function removeMember(id:string){
    setBusy(true);
    try{await json('/api/studio/conversations',options({room_id:roomId,member_id:id},'DELETE'));await loadHistory(roomId);}catch(e){setError(e instanceof Error?e.message:'Could not change room access.');}finally{setBusy(false);}
  }
  const configured=Boolean(index?.configuration.enabled&&index.configuration.configured);
  return <section className={styles.talk} aria-label="Aethelios working conversation">
    <header className={styles.talkHeader}>
      <div className={styles.aiIdentity}><span className={styles.orb} aria-hidden="true"/><div><strong>Aethelios</strong><small>{history?.room.scope==='shared'?'Shared Operations Room':'Private business coworker'}</small></div></div>
      <div className={styles.talkHeaderActions}><button type="button" className={styles.iconButton} aria-label="Working context" aria-expanded={contextOpen} onClick={()=>setContextOpen(v=>!v)}><PanelRight size={19}/></button><button type="button" className={styles.iconButton} aria-label="Conversation rooms" aria-expanded={threads} onClick={()=>setThreads(v=>!v)}><UsersRound size={19}/></button></div>
    </header>
    {threads?<div className={styles.threadPicker}>
      <div className={styles.sectionHeading}><h2>Your conversations</h2><button onClick={()=>void loadIndex().catch(e=>setError(e.message))} aria-label="Refresh rooms"><RefreshCw size={16}/></button></div>
      <button className={styles.secondary} onClick={()=>void create()} disabled={busy||!index}><Plus size={16}/> Private conversation</button>
      {index?.role==='owner'?<div className={styles.sharedCreate}>
        <label>Share with Katie’s verified account<select aria-label="Operations Room colleague" value={selectedColleague||index.sharedMembers[0]?.id||''} onChange={e=>setSelectedColleague(e.target.value)}>{index.sharedMembers.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
        <button className={styles.secondary} onClick={()=>void create(true)} disabled={busy||!index.sharedMembers.length}><UsersRound size={16}/> Create Operations Room</button>
      </div>:<p className={styles.muted}>Neil can invite your account to a shared Operations Room.</p>}
      <div className={styles.threadList}>{index?.rooms.map(room=><button key={room.id} onClick={()=>{setRoomId(room.id);setThreads(false);request.current=null;}} aria-current={room.id===roomId?'true':undefined}>{room.scope==='shared'?<UsersRound size={15}/>:<LockKeyhole size={15}/>}<span>{room.title}<small>{room.scope==='shared'?'Shared business conversation':'Only your account'}</small></span></button>)}</div>
    </div>:null}
    {!configured&&index?<div className={styles.notice}>Aethelios’s secure connection is awaiting activation. Your schedule and shared work are available.</div>:null}
    {history?.room.scope==='shared'?<div className={styles.roomNotice}>Shared with {history.members.map(m=>m.name.split(' ·')[0]).join(' + ')}. Messages here are visible to these members.
      {history.room.creator_id===index?.actorId?<details><summary>Room access</summary>{history.members.filter(m=>m.user_id!==index?.actorId).map(m=><button key={m.user_id} onClick={()=>void removeMember(m.user_id)} disabled={busy}>Remove {m.name.split(' ·')[0]} from this room</button>)}</details>:null}
    </div>:null}
    <div className={styles.talkBody}><div className={styles.talkColumn}><div className={styles.messages} aria-label="Conversation history" aria-busy={pending}>
      {!roomId?<div className={styles.conversationWelcome}><span className={styles.largeOrb} aria-hidden="true"/><p className={styles.eyebrow}>AETHELIOS FOR RESERVE</p><h2>Let’s put the day<br/>in order.</h2><p>Your working partner for schedules, decisions and the next move.</p><button className={styles.primary} onClick={()=>void create()} disabled={busy||!index}>Open a private conversation</button></div>:!history?<p className={styles.muted}>Opening your conversation…</p>:null}
      {history?.hasMore?<button className={styles.secondary} disabled={busy} onClick={()=>void earlier()}>Read earlier messages</button>:null}
      {history&&history.turns.length===0?<div className={styles.conversationWelcome}><h2>What are we working on?</h2><div className={styles.starters}>{['Give me today’s opening brief.','What work needs attention?','Walk me through tomorrow.'].map(prompt=><button key={prompt} onClick={()=>setText(prompt)}>{prompt}</button>)}</div></div>:null}
      {history?.turns.map(turn=><div key={turn.id} className={styles.turn}>
        <article className={styles.humanMessage}><small>{turn.actor_name?.split(' ·')[0]||'Operator'}</small><p>{turn.prompt}</p></article>
        <article className={styles.aiMessage}><small>AETHELIOS</small>
          {turn.status==='ready'?<><p className={styles.answer}>{turn.answer}</p><div className={styles.replyActions}><button onClick={()=>void copy(turn)}><Copy size={14}/>{copied===turn.id?'Copied':'Copy reply'}</button></div>
          {turn.evidence.length?<details className={styles.evidence}><summary>Records used · {turn.evidence.length}</summary>{turn.evidence.map((source,i)=><a key={source.href+i} href={source.href}>{source.label}<small>Read {new Date(source.asOf).toLocaleTimeString('en-US',{timeZone:'America/Chicago',hour:'numeric',minute:'2-digit'})} CT · {source.count} records · opens current authorized data</small></a>)}</details>:null}</>
          :<p role="status">{turn.status==='pending'?'Reviewing the permitted business records…':turn.status==='interrupted'?'This reply was interrupted. Your message is saved. Send a new request to continue.':`The reply could not finish (${turn.error_code?.replaceAll('_',' ')||'connection unavailable'}). Your message is saved.`}</p>}
        </article>
      </div>)}<div ref={end}/>
    </div>
    {error?<p role="alert" className={styles.error}>{error}</p>:null}
    <form className={styles.talkComposer} onSubmit={send}>
      <label className={styles.srOnly} htmlFor="reserve-talk-input">Message Aethelios</label>
      <textarea id="reserve-talk-input" value={text} onChange={e=>setText(e.target.value)} maxLength={3000} rows={3} placeholder="Talk through the day. Shape the next move." disabled={!roomId} onKeyDown={e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();e.currentTarget.form?.requestSubmit();}}}/>
      <button type="submit" className={styles.send} disabled={busy||pending||!configured||!roomId||!text.trim()} aria-label="Send message to Aethelios"><ArrowUp size={21}/></button>
      <small>Business conversation only. Keep private client notes and personal context in The Chair. Ctrl/⌘ + Enter to send.</small>
    </form>
    </div><aside className={styles.workingContext} data-open={contextOpen} aria-label="Permitted working context">
      <p className={styles.eyebrow}>WORKING CONTEXT</p><h3>The day around<br/>the conversation.</h3>
      <p className={styles.muted}>{history?.room.scope==='shared'?'Katie’s schedule + shared operations.':'Records permitted in this conversation.'}</p>
      {contextError?<p className={styles.notice}>{contextError}{context?' Showing the last successful snapshot.':''}</p>:null}
      {!roomId?<p className={styles.muted}>Open a conversation to bring its authorized records into view.</p>:!context&&!contextError?<p className={styles.muted}>Reading working context…</p>:null}
      {context?<><small className={styles.freshness}>Updated {new Date(context.asOf).toLocaleTimeString('en-US',{timeZone:'America/Chicago',hour:'numeric',minute:'2-digit'})} CT</small>
      <section><h4>Today’s schedule</h4>{context.schedule.visits.length?context.schedule.visits.slice(0,5).map(visit=><a key={visit.id} href={'/studio?tab=schedule&date='+context.schedule.date}><small>{new Date(visit.starts_at).toLocaleTimeString('en-US',{timeZone:'America/Chicago',hour:'numeric',minute:'2-digit'})} · {visit.status}</small><strong>{visit.service}</strong><small>REF {visit.id.slice(0,8).toUpperCase()}</small></a>):<p>No recorded visits today.</p>}</section>
      <section><h4>Open work</h4>{context.work.items.filter(w=>!w.completed).length?context.work.items.filter(w=>!w.completed).slice(0,5).map(item=><a key={item.id} href="/studio?tab=work"><small>{item.status} · {item.handoff_state==='none'?'Business work':item.handoff_state+' handoff'}</small><strong>{item.title}</strong></a>):<p>No open work in this scope.</p>}{context.work.truncated?<p>More work is available in Work.</p>:null}</section>
      <section><h4>Business foundation</h4><p>{context.facts.services.length} enabled services · {context.facts.approvedFacts.length} confirmed facts</p><a href="/studio?tab=knowledge">Open shared knowledge ↗</a></section>
      <section><h4>Commerce</h4><p>Awaiting verified connection. No payment or earnings assumptions.</p></section></>:null}
    </aside></div>
  </section>;
}
