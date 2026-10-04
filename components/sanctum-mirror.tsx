'use client';
import Link from 'next/link';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, LockKeyhole, ScanFace, Sparkles } from 'lucide-react';
import { buildGroomingBlueprint, GROOMING_DRAFT_KEY } from '@/lib/grooming';

const focusOptions = ['Sharper beard structure', 'A stronger haircut direction', 'Healthier-looking skin', 'A simpler daily ritual'];
const maintenanceOptions = ['Five minutes or less', 'A considered daily ritual', 'I will maintain the right look'];
const skinOptions = ['Dryness or tightness', 'Oil and visible pores', 'Redness or irritation', 'Texture and uneven tone', 'No major concern'];
const hairOptions = ['Fine or thinning', 'Straight', 'Wavy', 'Curly or coiled', 'Not sure yet'];
const beardOptions = ['Clean shaven', 'Short or stubble', 'Medium and shaped', 'Full beard', 'Uneven or still developing'];
export function SanctumMirror({ user }: { user: { id: string } | null }) {
  const [step, setStep] = useState(0);
  const [focus, setFocus] = useState<string[]>([]);
  const [maintenance, setMaintenance] = useState('');
  const [skin, setSkin] = useState('');
  const [hair, setHair] = useState('');
  const [beard, setBeard] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const heading = useRef<HTMLHeadingElement>(null);
  const draft = useMemo(() => buildGroomingBlueprint({ focus, maintenance, skin, hair, beard }), [focus, maintenance, skin, hair, beard]);
  const ready = focus.length > 0 && Boolean(maintenance && skin && hair && beard);
  useEffect(() => { heading.current?.focus({ preventScroll: true }); document.title = `${step + 1} of 3 · The Sanctum Mirror · The Reserve`; }, [step]);
  function go(next: number) { setStep(next);setError('');window.scrollTo({top:0,behavior:'instant'}); }
  async function save() {
    setError('');setBusy(true);
    try {
      if (!user) {
        sessionStorage.setItem(GROOMING_DRAFT_KEY, JSON.stringify({version:1,owner:null,expires:Date.now()+30*60*1000,value:draft}));
        window.location.assign('/signin?next=/my-sanctum');
        return;
      }
      const response = await fetch('/api/grooming-profile',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(draft)});
      const data = await response.json();
      if (!response.ok) throw Error(data.error || 'Your Blueprint couldn’t save.');
      setSaved(true);
      try {sessionStorage.removeItem(GROOMING_DRAFT_KEY);} catch {}
    } catch (caught) {setError(user ? (caught as Error).message : 'This browser couldn’t keep your Blueprint through sign-in. Your direction is still here. Allow site storage and try again.');}
    finally {setBusy(false);}
  }
  return <div className="mirror-experience">
    <ol className="mirror-progress" aria-label="Blueprint progress">{['Enter','Your priorities','Review'].map((label,index)=><li key={label} aria-current={index === step ? 'step' : undefined}><span className={index<=step?'active':''}><i>{index<step?<Check size={12}/>:index+1}</i>{label}</span></li>)}</ol>
    {step===0 && <section className="mirror-intro"><div className="mirror-orbit" aria-hidden="true"><ScanFace/><span/><span/></div><p className="eyebrow">THE SANCTUM MIRROR · NEIL’S WORLD</p><h1 ref={heading} tabIndex={-1}>Know your direction.<br/><em>Keep it workable.</em></h1><p>Start with your hair, beard, skin priorities, and the time you want to give them. Your answers shape a first grooming Blueprint.</p><div className="mirror-trust"><LockKeyhole size={15}/><span>No camera, photograph analysis, or diagnosis. Saving is your choice.</span></div><button className="button button-gold" onClick={()=>go(1)}>Begin your Blueprint <ArrowRight size={18}/></button></section>}
    {step===1 && <section className="profile-stage"><div className="mirror-stage-heading"><p className="eyebrow">01 / YOUR PRIORITIES</p><h2 ref={heading} tabIndex={-1}>Build around<br/><em>your real life.</em></h2><p>Your stated choices guide this starting point. Refine it with your grooming professional.</p></div><div className="profile-questions"><ChoiceGroup title="What should improve first?" options={focusOptions} selected={focus} multiple onChange={value=>setFocus(current=>current.includes(value)?current.filter(item=>item!==value):[...current,value].slice(0,3))}/><ChoiceGroup title="How much daily maintenance feels realistic?" options={maintenanceOptions} selected={[maintenance]} onChange={setMaintenance}/><ChoiceGroup title="Your primary skin priority" options={skinOptions} selected={[skin]} onChange={setSkin}/><ChoiceGroup title="Your natural hair pattern" options={hairOptions} selected={[hair]} onChange={setHair}/><ChoiceGroup title="Your current facial hair" options={beardOptions} selected={[beard]} onChange={setBeard}/></div><div className="capture-controls"><button className="text-link" onClick={()=>go(0)}><ArrowLeft size={16}/> Back</button><button className="button button-gold" disabled={!ready} onClick={()=>go(2)}>Review my Blueprint <Sparkles size={17}/></button></div></section>}
    {step===2 && <section className="blueprint-stage"><p className="eyebrow">YOUR FIRST GROOMING BLUEPRINT</p><h2 ref={heading} tabIndex={-1}>A direction<br/><em>that belongs to you.</em></h2><p className="mirror-review-note">Built from your stated priorities. This is preliminary grooming direction, not professional aftercare or a medical assessment.</p><div className="blueprint-grid"><article className="blueprint-direction"><span>01 / DIRECTION</span><h3>Your starting point</h3><p>{draft.blueprint.direction}</p><div className="profile-tags">{draft.focus.map(item=><span key={item}>{item}</span>)}</div></article><article><span>02 / DAILY RITUAL</span><h3>Your foundation</h3><ol>{draft.blueprint.ritual.map(item=><li key={item}>{item}</li>)}</ol></article><article><span>03 / CONSULTATION</span><h3>Make it practical</h3><p>Bring your questions and a look you have in mind. Your grooming professional can help refine the direction in person.</p></article></div><div className="save-blueprint"><div><p className="eyebrow">KEEP WHAT YOU BUILT</p><h3>{saved ? 'Saved to your Reserve.' : 'Your choice to save.'}</h3><p>{saved ? 'Your Blueprint is private to your account.' : user ? 'Save this direction to your current account. No photographs or Chair answers are included.' : 'Sign in, review your direction, then confirm saving. The sign-in draft expires after 30 minutes.'}</p></div><div>{saved ? <Link href="/my-visit" className="button button-gold">Return to your visit ↗</Link> : <button className="button button-gold" disabled={busy} onClick={save}>{busy?'Saving…':user?'Save to my Reserve':'Keep my Blueprint'} <ArrowRight size={17}/></button>}<button className="text-link" disabled={busy} onClick={()=>{setSaved(false);go(1);}}>Edit my priorities</button></div></div>{error && <p className="error-message" role="alert">{error}</p>}</section>}
  </div>;
}
function ChoiceGroup({title,options,selected,onChange,multiple=false}:{title:string;options:string[];selected:string[];onChange:(value:string)=>void;multiple?:boolean}) {
  return <fieldset className="choice-group"><legend>{title}{multiple && <small> Choose up to three</small>}</legend><div>{options.map(option=><button type="button" aria-pressed={selected.includes(option)} key={option} className={selected.includes(option)?'selected':''} onClick={()=>onChange(option)}><span>{selected.includes(option)&&<Check size={14}/>}</span>{option}</button>)}</div></fieldset>;
}
