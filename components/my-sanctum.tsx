"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowUpRight, CalendarDays, Check, Clock3, ScanFace, Sparkles } from "lucide-react";
import { GROOMING_DRAFT_KEY, type GroomingDraft, type GroomingProfile } from "@/lib/grooming";

export function MySanctum({ name }: { name: string }) {
  const [profile, setProfile] = useState<GroomingProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    async function openProfile() {
      const saved = sessionStorage.getItem(GROOMING_DRAFT_KEY);
      if (saved) {
        const draft = JSON.parse(saved) as GroomingDraft;
        const response = await fetch("/api/grooming-profile", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(draft) });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error);
        setProfile(data.profile);
        sessionStorage.removeItem(GROOMING_DRAFT_KEY);
        setMessage("Your Grooming Blueprint is now saved to My Sanctum.");
        return;
      }
      const response = await fetch("/api/grooming-profile");
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setProfile(data.profile);
    }
    openProfile().catch((caught) => setError((caught as Error).message)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="sanctum-loading"><div className="mirror-orbit"><ScanFace /><span /><span /></div><p>Opening your private grooming profile…</p></div>;

  return (
    <div className="my-sanctum-shell">
      <header className="sanctum-command">
        <div><p className="eyebrow">MY SANCTUM</p><h1>Welcome, <em>{name}.</em></h1><p>Your grooming direction, visits, and rituals—kept together.</p></div>
        <Link href="/book" className="button button-gold">Book a visit <ArrowUpRight size={17} /></Link>
      </header>
      {message && <p className="sanctum-success"><Check size={17} />{message}</p>}
      {error && <p className="error-message" role="alert">{error}</p>}
      {!profile ? (
        <section className="empty-blueprint"><ScanFace size={42} /><p className="eyebrow">YOUR PROFILE IS READY TO BEGIN</p><h2>Meet yourself<br /><em>in the Mirror.</em></h2><p>Complete the guided experience to create your first personal grooming direction.</p><Link href="/sanctum-mirror" className="button button-gold">Begin the Sanctum Mirror <ArrowUpRight size={17} /></Link></section>
      ) : (
        <>
          <section className="profile-hero-card">
            <div className="profile-visual"><div className="profile-silhouette"><ScanFace size={76} /></div><span>PROFILE ACTIVE</span></div>
            <div className="profile-summary"><p className="eyebrow">LIVING GROOMING PROFILE</p><h2>Your current<br /><em>direction.</em></h2><p>{profile.blueprint.direction}</p><div className="profile-tags">{profile.focus.map((item) => <span key={item}>{item}</span>)}</div><Link href="/sanctum-mirror" className="text-link">Update your profile <ArrowUpRight size={16} /></Link></div>
          </section>
          <section className="sanctum-dashboard-grid">
            <article><span className="dashboard-icon"><Sparkles /></span><p className="eyebrow">YOUR RITUAL</p><h3>Daily foundation</h3><ol>{profile.blueprint.ritual.map((item) => <li key={item}>{item}</li>)}</ol></article>
            <article><span className="dashboard-icon"><CalendarDays /></span><p className="eyebrow">THE RESERVE</p><h3>Your next visit</h3><p>Bring your saved Blueprint into the consultation. Your professional notes and results will build from here.</p><Link href="/account" className="text-link">Open your visits <ArrowUpRight size={16} /></Link></article>
            <article><span className="dashboard-icon"><Clock3 /></span><p className="eyebrow">MAINTENANCE RHYTHM</p><h3>{profile.maintenance}</h3><p>Your future care plan and recommended return rhythm will appear here after consultation.</p></article>
          </section>
        </>
      )}
    </div>
  );
}
