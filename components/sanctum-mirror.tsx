"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Camera, Check, LockKeyhole, ScanFace, Sparkles } from "lucide-react";
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
  const [cameraState, setCameraState] = useState<"idle" | "live" | "blocked" | "complete">("idle");
  const [angle, setAngle] = useState(0);
  const video = useRef<HTMLVideoElement>(null);
  const stream = useRef<MediaStream | null>(null);
  const angles = ["Front", "Turn slightly left", "Turn slightly right"];

  const draft = useMemo(() => buildGroomingBlueprint({ focus, maintenance, skin, hair, beard }), [focus, maintenance, skin, hair, beard]);

  useEffect(() => () => stream.current?.getTracks().forEach((track) => track.stop()), []);
  useEffect(() => {
    if (cameraState === "live" && video.current && stream.current) {
      video.current.srcObject = stream.current;
    }
  }, [cameraState]);

  async function startCamera() {
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user", width: { ideal: 1280 }, height: { ideal: 1280 } }, audio: false });
      setCameraState("live");
    } catch {
      setCameraState("blocked");
    }
  }

  function captureAngle() {
    if (angle < 2) setAngle(angle + 1);
    else {
      stream.current?.getTracks().forEach((track) => track.stop());
      setCameraState("complete");
    }
  }

  function completeProfile() {
    sessionStorage.setItem(GROOMING_DRAFT_KEY, JSON.stringify(draft));
    setStep(3);
  }

  const ready = focus.length > 0 && maintenance && skin && hair && beard;

  return (
    <div className="mirror-experience">
      <div className="mirror-progress" aria-label={`Step ${Math.min(step + 1, 4)} of 4`}>
        {["Enter", "Capture", "Profile", "Blueprint"].map((label, index) => (
          <span key={label} className={index <= step ? "active" : ""}><i>{index < step ? <Check size={12} /> : index + 1}</i>{label}</span>
        ))}
      </div>

      {step === 0 && (
        <section className="mirror-intro">
          <div className="mirror-orbit" aria-hidden="true"><ScanFace /><span /><span /></div>
          <p className="eyebrow">THE SANCTUM MIRROR</p>
          <h1>Your grooming,<br /><em>finally understood.</em></h1>
          <p>Begin with a guided facial capture and a few precise choices. Leave with a personal Grooming Blueprint built to travel with you into every visit.</p>
          <div className="mirror-trust"><LockKeyhole size={15} /><span>Your capture remains private. Your profile is saved only when you choose.</span></div>
          <button className="button button-gold" onClick={() => setStep(1)}>Begin your Blueprint <ArrowRight size={18} /></button>
        </section>
      )}

      {step === 1 && (
        <section className="capture-stage">
          <div className="mirror-stage-heading"><p className="eyebrow">01 / GUIDED CAPTURE</p><h2>Three angles.<br /><em>One complete view.</em></h2><p>The guided frame prepares a consistent visual reference for your consultation. It does not make a medical diagnosis.</p></div>
          <div className={`capture-view ${cameraState}`}>
            {cameraState === "live" && <video ref={video} autoPlay muted playsInline />}
            <div className="face-guide" aria-hidden="true"><span className="guide-eye left" /><span className="guide-eye right" /><span className="guide-jaw" /></div>
            <div className="scan-line" />
            <span className="capture-angle">{cameraState === "complete" ? "CAPTURE COMPLETE" : angles[angle]}</span>
            {cameraState === "idle" && <button className="capture-start" onClick={startCamera}><Camera size={25} />Activate camera</button>}
            {cameraState === "blocked" && <div className="camera-message"><p>Camera access was unavailable.</p><button className="text-link" onClick={() => setCameraState("complete")}>Continue with your guided profile</button></div>}
            {cameraState === "live" && <button className="capture-button" onClick={captureAngle} aria-label={`Capture ${angles[angle]} angle`}><span /></button>}
            {cameraState === "complete" && <Check className="capture-check" size={42} />}
          </div>
          <div className="capture-controls">
            <button className="text-link" onClick={() => setStep(0)}><ArrowLeft size={16} /> Back</button>
            {cameraState !== "complete" && <button className="text-link subtle" onClick={() => setCameraState("complete")}>Complete profile without camera</button>}
            <button className="button button-gold" disabled={cameraState !== "complete"} onClick={() => setStep(2)}>Continue <ArrowRight size={17} /></button>
          </div>
        </section>
      )}

      {step === 2 && (
        <section className="profile-stage">
          <div className="mirror-stage-heading"><p className="eyebrow">02 / YOUR PRIORITIES</p><h2>Build around<br /><em>your real life.</em></h2><p>Select what matters now. Your answers shape the first Blueprint and give the in-person consultation a stronger starting point.</p></div>
          <div className="profile-questions">
            <ChoiceGroup title="What should improve first?" options={focusOptions} selected={focus} multiple onChange={(value) => setFocus((current) => current.includes(value) ? current.filter((item) => item !== value) : [...current, value].slice(0, 3))} />
            <ChoiceGroup title="How much daily maintenance feels realistic?" options={maintenanceOptions} selected={[maintenance]} onChange={setMaintenance} />
            <ChoiceGroup title="Your primary skin priority" options={skinOptions} selected={[skin]} onChange={setSkin} />
            <ChoiceGroup title="Your natural hair pattern" options={hairOptions} selected={[hair]} onChange={setHair} />
            <ChoiceGroup title="Your current facial hair" options={beardOptions} selected={[beard]} onChange={setBeard} />
          </div>
          <div className="capture-controls"><button className="text-link" onClick={() => setStep(1)}><ArrowLeft size={16} /> Back</button><button className="button button-gold" disabled={!ready} onClick={completeProfile}>Reveal my Blueprint <Sparkles size={17} /></button></div>
        </section>
      )}

      {step === 3 && (
        <section className="blueprint-stage">
          <div className="blueprint-seal"><Sparkles size={22} /><span>FOUNDATION COMPLETE</span></div>
          <p className="eyebrow">YOUR FIRST GROOMING BLUEPRINT</p>
          <h2>A stronger direction.<br /><em>Built around you.</em></h2>
          <div className="blueprint-grid">
            <article className="blueprint-direction"><span>01 / DIRECTION</span><h3>Your starting point</h3><p>{draft.blueprint.direction}</p><div className="profile-tags">{draft.focus.map((item) => <span key={item}>{item}</span>)}</div></article>
            <article><span>02 / DAILY RITUAL</span><h3>Your foundation</h3><ol>{draft.blueprint.ritual.map((item) => <li key={item}>{item}</li>)}</ol></article>
            <article><span>03 / CONSULTATION</span><h3>What happens next</h3><p>Bring this Blueprint into the Reserve. We will refine your visual direction, document what works, and evolve the profile after every visit.</p></article>
          </div>
          <div className="save-blueprint">
            <div><p className="eyebrow">KEEP WHAT YOU BUILT</p><h3>Save it to My Sanctum.</h3><p>One tap creates your private grooming account. No registration form and no new password to remember.</p></div>
            <SocialAuthButtons next="/my-sanctum" preview={preview} />
          </div>
        </section>
      )}
    </div>
  );
}

function ChoiceGroup({ title, options, selected, onChange, multiple = false }: { title: string; options: string[]; selected: string[]; onChange: (value: string) => void; multiple?: boolean }) {
  return <fieldset className="choice-group"><legend>{title}{multiple && <small> Choose up to three</small>}</legend><div>{options.map((option) => <button type="button" key={option} className={selected.includes(option) ? "selected" : ""} onClick={() => onChange(option)}><span>{selected.includes(option) && <Check size={14} />}</span>{option}</button>)}</div></fieldset>;
}
