"use client";
import { createContext, useContext, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { AetheliosOrb } from "./aethelios-orb";
type Request = {
  draft?: string;
  lane?: "reserve" | "fix-it" | "gent";
  onUse?: (copy: string) => void;
};
const AssistantContext = createContext<(request?: Request) => void>(() => {});
export const useStudioAssistant = () => useContext(AssistantContext);
export function StudioAssistant({
  children,
  connected,
}: {
  children: React.ReactNode;
  connected: boolean;
}) {
  const path = usePathname();
  const dialog = useRef<HTMLDialogElement>(null),
    request = useRef<Request>({}),
    controller = useRef<AbortController | null>(null);
  const [prompt, setPrompt] = useState(""),
    [answer, setAnswer] = useState(""),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  useEffect(() => {
    controller.current?.abort();
    dialog.current?.close();
    setBusy(false);
  }, [path]);
  useEffect(() => () => controller.current?.abort(), []);
  const open = (options: Request = {}) => {
    controller.current?.abort();
    request.current = options;
    setPrompt("");
    setAnswer("");
    setError("");
    setNotice("");
    setBusy(false);
    dialog.current?.showModal();
  };
  const close = () => {
    controller.current?.abort();
    dialog.current?.close();
    setBusy(false);
  };
  async function ask(e: React.FormEvent) {
    e.preventDefault();
    if (busy || !prompt.trim()) return;
    setBusy(true);
    setError("");
    setAnswer("");
    setNotice("");
    const abort = new AbortController();
    controller.current = abort;
    try {
      const room = path.split("/")[2] || "command";
      const result = await fetch("/api/studio/aethelios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          draft: request.current.draft || "",
          lane: request.current.lane || "reserve",
          room,
        }),
        signal: abort.signal,
      });
      const data = await result.json();
      if (!result.ok) throw Error(data.error || "Aethelios is unavailable.");
      if (!abort.signal.aborted) setAnswer(data.answer);
    } catch (e) {
      if (!abort.signal.aborted)
        setError(e instanceof Error ? e.message : "Could not connect.");
    } finally {
      if (!abort.signal.aborted) setBusy(false);
    }
  }
  return (
    <AssistantContext.Provider value={open}>
      {children}
      <button
        className="assistant-launch"
        onClick={() => open()}
        aria-label="Ask Aethelios"
      >
        <AetheliosOrb compact />
        <span>Aethelios</span>
      </button>
      <dialog ref={dialog} className="assistant-room" onCancel={close}>
        <header className="studio-dialog-head">
          <span>AETHELIOS · LEGACY RESERVE</span>
          <button onClick={close} aria-label="Close Aethelios">
            ✕
          </button>
        </header>
        <div className="assistant-intro">
          <AetheliosOrb active={busy} />
          <h2>Let’s shape the work.</h2>
          <p>
            {connected
              ? "Your drafting workspace. Think it through. Make it clear."
              : "Connection pending. You can keep writing and saving in Content Studio."}
          </p>
        </div>
        <form onSubmit={ask}>
          <label htmlFor="assistant-prompt">What are we working on?</label>
          <textarea
            id="assistant-prompt"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            maxLength={2000}
            rows={3}
            placeholder="Draft an introduction for Fix It Shop…"
          />
          {request.current.draft ? (
            <small>The current draft will be included with this request.</small>
          ) : (
            <small>Only what you type here is shared with Aethelios.</small>
          )}
          <button
            className="button button-gold"
            disabled={busy || !connected || !prompt.trim()}
          >
            {busy ? "Thinking…" : "Ask Aethelios"}
          </button>
        </form>
        {error ? (
          <p className="studio-error" role="alert">
            {error}
          </p>
        ) : null}
        <div aria-live="polite">
          {answer ? (
            <section className="assistant-answer">
              <p>{answer}</p>
              <div className="studio-controls">
                <button
                  className="button button-outline"
                  onClick={async () => {
                    try {
                      await navigator.clipboard.writeText(answer);
                      setNotice("Copied.");
                    } catch {
                      setNotice("Select the response to copy it.");
                    }
                  }}
                >
                  Copy response
                </button>
                {request.current.onUse ? (
                  <button
                    className="button button-gold"
                    onClick={() => {
                      request.current.onUse?.(answer);
                      close();
                    }}
                  >
                    Use in draft
                  </button>
                ) : null}
              </div>
              <small>Review suggestions before using them.</small>
            </section>
          ) : null}
          <p className="studio-notice">{notice}</p>
        </div>
      </dialog>
    </AssistantContext.Provider>
  );
}
