"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight, CalendarDays, Check, Clock3, ScanFace, Sparkles } from "lucide-react";
import { readGroomingHandoff } from "@/lib/grooming-validation";
import { GROOMING_DRAFT_KEY, type GroomingDraft, type GroomingProfile } from "@/lib/grooming";

export function MySanctum({ name, userId }: { name: string; userId: string }) {
  const [pending, setPending] = useState<GroomingDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<GroomingProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    async function openProfile() {
      try {
        const raw = sessionStorage.getItem(GROOMING_DRAFT_KEY);
        const draft = readGroomingHandoff(raw, userId);
        setPending(draft);
        if (raw && !draft) sessionStorage.removeItem(GROOMING_DRAFT_KEY);
      } catch { /* Blocked storage must not prevent reading a saved profile. */ }
      const response = await fetch("/api/grooming-profile", {cache:"no-store", signal: controller.signal});
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setProfile(data.profile);
    }
    openProfile().catch((caught) => {if (caught.name !== "AbortError") setError(caught.message);}).finally(() => {if (!controller.signal.aborted) setLoading(false);});
    return () => controller.abort();
  }, [userId]);

  async function savePending() {
    if (!pending) return;
    setSaving(true);setError("");
    try {
      const response = await fetch("/api/grooming-profile", {method:"PUT",headers:{"Content-Type":"application/json"},body:JSON.stringify(pending)});
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setProfile(data.profile);setPending(null);
      try {sessionStorage.removeItem(GROOMING_DRAFT_KEY);} catch {}
      setMessage("Your Grooming Blueprint is saved to your current Reserve account.");
    } catch (caught) {setError((caught as Error).message);}
    finally {setSaving(false);}
  }
  function discardPending() {
    setPending(null);
    try {sessionStorage.removeItem(GROOMING_DRAFT_KEY);} catch {}
    setMessage("Your unsaved Blueprint was discarded. Your saved profile is unchanged.");
  }

  if (loading) return <div className="sanctum-loading"><div className="mirror-orbit"><ScanFace /><span /><span /></div><p>Opening your private grooming profile…</p></div>;

  return (
    <div className="my-sanctum-shell">
      <header className="sanctum-command">
        <div><p className="eyebrow">MY SANCTUM</p><h1>Welcome, <em>{name}.</em></h1><p>Your grooming direction, visits, and rituals—kept together.</p></div>
        <Link href="/book" className="button button-gold">Book a visit <ArrowUpRight size={17} /></Link>
      </header>
      {pending && <section className="blueprint-handoff" aria-labelledby="handoff-heading"><p className="eyebrow">REVIEW BEFORE SAVING</p><h2 id="handoff-heading">Keep this direction, {name}?</h2><p>{pending.blueprint.direction}</p><p>This saves to the account signed in now. It is preliminary direction from your choices; your existing Blueprint changes only when you confirm.</p><div className="hero-actions"><button className="button button-gold" disabled={saving} onClick={savePending}>{saving ? "Saving…" : "Confirm & save my Blueprint"}</button><button className="text-link" disabled={saving} onClick={discardPending}>Discard this draft</button></div></section>}
      <section className="chair-profile-link"><div><p className="eyebrow">KATIE · THE CHAIR</p><h2>Your cut. Your time.</h2><p>Open your saved preferences, prepare for a visit, or change what Katie can see.</p></div><Link href="/chair" className="button button-gold">Open my Chair <ArrowUpRight size={17}/></Link></section>
      {message && <p className="sanctum-success"><Check size={17} />{message}</p>}
      {error && <p className="error-message" role="alert">{error}</p>}
      {!profile && !error ? (
        <section className="empty-blueprint"><ScanFace size={42} /><p className="eyebrow">YOUR PROFILE IS READY TO BEGIN</p><h2>Meet yourself<br /><em>in the Mirror.</em></h2><p>Complete the guided experience to create your first personal grooming direction.</p><Link href="/sanctum-mirror" className="button button-gold">Begin the Sanctum Mirror <ArrowUpRight size={17} /></Link></section>
      ) : profile ? (
        <>
          <section className="profile-hero-card">
            <div className="profile-visual"><div className="profile-silhouette"><ScanFace size={76} /></div><span>PROFILE ACTIVE</span></div>
            <div className="profile-summary"><p className="eyebrow">LIVING GROOMING PROFILE</p><h2>Your current<br /><em>direction.</em></h2><p>{profile.blueprint.direction}</p><p className="saved-blueprint-note">Saved from your stated choices. A starting point to refine in person, not professional aftercare or a diagnosis.</p><div className="profile-tags">{profile.focus.map((item) => <span key={item}>{item}</span>)}</div><Link href="/sanctum-mirror" className="text-link">Update your profile <ArrowUpRight size={16} /></Link></div>
          </section>
          <section className="sanctum-dashboard-grid">
            <article><span className="dashboard-icon"><Sparkles /></span><p className="eyebrow">YOUR RITUAL</p><h3>Daily foundation</h3><ol>{profile.blueprint.ritual.map((item) => <li key={item}>{item}</li>)}</ol></article>
            <article><span className="dashboard-icon"><CalendarDays /></span><p className="eyebrow">THE RESERVE</p><h3>Your next visit</h3><p>Bring your saved Blueprint into the conversation and refine the direction in person.</p><Link prefetch={false} href="/my-visit" className="text-link">Open your visit & ongoing care <ArrowUpRight size={16} /></Link></article>
            <article><span className="dashboard-icon"><Clock3 /></span><p className="eyebrow">YOUR DAILY TIME</p><h3>{profile.maintenance}</h3><p>The daily effort you chose for your grooming routine. Refine it with your grooming professional.</p></article>
          </section>
        </>
      ) : null}
    </div>
  );
}
