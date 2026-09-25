"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, ArrowRight, Check, LockKeyhole, Sparkles } from "lucide-react";
import { buildGroomingBlueprint, GROOMING_DRAFT_KEY } from "@/lib/grooming";
import { SocialAuthButtons } from "@/components/social-auth-buttons";

const focusOptions = ["Sharper beard structure", "A stronger haircut direction", "Healthier-looking skin", "A simpler daily ritual"];
const maintenanceOptions = ["Five minutes or less", "A considered daily ritual", "I will maintain the right look"];
const skinOptions = ["Dryness or tightness", "Oil and visible pores", "Redness or irritation", "Texture and uneven tone", "No major concern"];
const hairOptions = ["Fine or thinning", "Straight", "Wavy", "Curly or coiled", "Not sure yet"];
const beardOptions = ["Clean shaven", "Short or stubble", "Medium and shaped", "Full beard", "Uneven or still developing"];

export function SanctumMirror({ preview }: { preview: boolean }) {
  const [step, setStep] = useState(0);
  const [focus, setFocus] = useState<string[]>([]);
  const [maintenance, setMaintenance] = useState("");
  const [skin, setSkin] = useState("");
  const [hair, setHair] = useState("");
  const [beard, setBeard] = useState("");
  const draft = useMemo(() => buildGroomingBlueprint({ focus, maintenance, skin, hair, beard }), [focus, maintenance, skin, hair, beard]);
  const ready = focus.length > 0 && maintenance && skin && hair && beard;

  function completeProfile() {
    sessionStorage.setItem(GROOMING_DRAFT_KEY, JSON.stringify(draft));
    setStep(2);
  }

  return (
    <div className="mirror-experience">
      <div className="mirror-progress" aria-label={`Step ${step + 1} of 3`}>
        {["Begin", "Priorities", "Blueprint"].map((label, index) => (
          <span key={label} className={index <= step ? "active" : ""}><i>{index < step ? <Check size={12} /> : index + 1}</i>{label}</span>
        ))}
      </div>
      {step === 0 && (
        <section className="mirror-intro">
          <div className="mirror-orbit" aria-hidden="true"><Sparkles /><span /><span /></div>
          <p className="eyebrow">THE SANCTUM MIRROR · RESERVE INTAKE</p>
          <h1>Arrive with<br /><em>direction.</em></h1>
          <p>Tell us what matters to you about your hair, beard, skin, and daily routine. Leave with a first Grooming Blueprint to bring into a Reserve consultation.</p>
          <div className="mirror-trust"><LockKeyhole size={15} /><span>This guided intake uses your answers, not a photo analysis. Nothing is saved to your Reserve account unless you choose to sign in.</span></div>
          <button className="button button-gold" onClick={() => setStep(1)}>Begin your Blueprint <ArrowRight size={18} /></button>
        </section>
      )}
      {step === 1 && (
        <section className="profile-stage">
          <div className="mirror-stage-heading"><p className="eyebrow">01 / YOUR PRIORITIES</p><h2>Build around<br /><em>your real life.</em></h2><p>Your answers shape a starting direction for your consultation. They are not a visual scan or a diagnosis.</p></div>
          <div className="profile-questions">
            <ChoiceGroup title="What should improve first?" options={focusOptions} selected={focus} multiple onChange={(value) => setFocus((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value].slice(0, 3))} />
            <ChoiceGroup title="How much daily maintenance feels realistic?" options={maintenanceOptions} selected={[maintenance]} onChange={setMaintenance} />
            <ChoiceGroup title="Your primary skin priority" options={skinOptions} selected={[skin]} onChange={setSkin} />
            <ChoiceGroup title="Your natural hair pattern" options={hairOptions} selected={[hair]} onChange={setHair} />
            <ChoiceGroup title="Your current facial hair" options={beardOptions} selected={[beard]} onChange={setBeard} />
          </div>
          <div className="capture-controls"><button className="text-link" onClick={() => setStep(0)}><ArrowLeft size={16} /> Back</button><button className="button button-gold" disabled={!ready} onClick={completeProfile}>Reveal my Blueprint <Sparkles size={17} /></button></div>
        </section>
      )}
      {step === 2 && (
        <section className="blueprint-stage">
          <div className="blueprint-seal"><Sparkles size={22} /><span>YOUR STARTING POINT</span></div>
          <p className="eyebrow">YOUR FIRST GROOMING BLUEPRINT</p>
          <h2>A stronger direction.<br /><em>Built around you.</em></h2>
          <div className="blueprint-grid">
            <article className="blueprint-direction"><span>01 / DIRECTION</span><h3>Your starting point</h3><p>{draft.blueprint.direction}</p><div className="profile-tags">{draft.focus.map((item) => <span key={item}>{item}</span>)}</div></article>
            <article><span>02 / DAILY RITUAL</span><h3>Your foundation</h3><ol>{draft.blueprint.ritual.map((item) => <li key={item}>{item}</li>)}</ol></article>
            <article><span>03 / CONSULTATION</span><h3>What happens next</h3><p>Bring this first direction into the Reserve. Neil can refine your grooming plan with you; Katie’s Chair preferences and private studio notes stay separate.</p></article>
          </div>
          <div className="save-blueprint">
            <div><p className="eyebrow">KEEP WHAT YOU BUILT</p><h3>Save your Reserve intake.</h3><p>Sign in to your Reserve account to save this Blueprint for your consultation. Gent Ascend is a separate app; this does not send your answers there.</p></div>
            <div className="mirror-save-options">
              <SocialAuthButtons next="/my-sanctum" preview={preview} />
              <Link href="/signin?next=/my-sanctum" className="text-link">Continue with email <ArrowRight size={16} /></Link>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}

function ChoiceGroup({ title, options, selected, onChange, multiple = false }: { title: string; options: string[]; selected: string[]; onChange: (value: string) => void; multiple?: boolean }) {
  return <fieldset className="choice-group"><legend>{title}{multiple && <small> Choose up to three</small>}</legend><div>{options.map((option) => <button type="button" key={option} className={selected.includes(option) ? "selected" : ""} onClick={() => onChange(option)}><span>{selected.includes(option) && <Check size={14} />}</span>{option}</button>)}</div></fieldset>;
}
