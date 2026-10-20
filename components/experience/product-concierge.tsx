"use client";
import { useState } from "react";
import Link from "next/link";
import type { ConciergeReply } from "@/lib/member-concierge";
export function ProductConcierge({ handle, name }: { handle: string; name: string }) {
  const [question, setQuestion] = useState(""), [reply, setReply] = useState<ConciergeReply | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState(""), [signIn, setSignIn] = useState(false);
  async function ask(message: string) {
    if (busy) return;
    setBusy(true); setError(""); setSignIn(false); setReply(null);
    try {
      const response = await fetch("/api/aethelios/member", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message, productHandle: handle }) });
      const data = await response.json();
      if (!response.ok) { setSignIn(response.status === 401 || response.status === 403); throw new Error(data.error || "Product guidance is temporarily unavailable."); }
      setReply(data);
    } catch (e) { setError(e instanceof Error ? e.message : "Please try again."); }
    finally { setBusy(false); }
  }
  return <section className="universe-concierge" id="product-concierge" aria-labelledby="product-concierge-title">
    <div><p className="universe-kicker">AETHELIOS / PRODUCT CONCIERGE</p><h2 id="product-concierge-title">A more considered choice.</h2><p>Explore {name} through its published formulation, usage instructions and current Shopify options.</p><small>Uses your existing Reserve account. Guidance does not add products or complete purchases.</small></div>
    <div><div className="universe-prompts">{["What ingredients are published?", "How do I use this product?", "What is the current price and availability?"].map(q => <button key={q} disabled={busy} onClick={() => void ask(q)}>{q} ↗</button>)}</div>
      <form onSubmit={e => { e.preventDefault(); void ask(question); }}><label htmlFor="product-question">Ask about this product</label><textarea id="product-question" value={question} onChange={e => setQuestion(e.target.value)} required maxLength={2000} rows={2} /><button className="button button-gold" disabled={busy || !question.trim()}>{busy ? "Checking…" : "Ask Aethelios ↗"}</button></form>
      <div aria-live="polite">{reply && <div className="universe-answer"><span className="universe-kicker">PUBLISHED PRODUCT GUIDANCE</span><p>{reply.text}</p>{reply.links.map(l => <Link key={l.href} href={l.href}>{l.label} ↗</Link>)}</div>}{error && <p>{error}</p>}{signIn && <Link href={`/signin?next=${encodeURIComponent(`/shop/products/${handle}#product-concierge`)}`}>Sign in to your Reserve ↗</Link>}</div>
    </div>
  </section>;
}
