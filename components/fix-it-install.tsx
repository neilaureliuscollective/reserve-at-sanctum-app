"use client";
import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};
type Installation = {
  available: boolean;
  installed: boolean;
  request: () => Promise<string>;
};
const InstallationContext = createContext<Installation>({
  available: false,
  installed: false,
  request: async () => "Use your browser’s install option.",
});
export function FixItInstallCapture({ children }: { children: ReactNode }) {
  const event = useRef<InstallEvent | null>(null),
    [available, setAvailable] = useState(false),
    [installed, setInstalled] = useState(false);
  useEffect(() => {
    const standalone = window.matchMedia("(display-mode: standalone)");
    setInstalled(standalone.matches);
    const ready = (e: Event) => {
      e.preventDefault();
      event.current = e as InstallEvent;
      setAvailable(true);
    };
    const done = () => {
      setAvailable(false);
      setInstalled(true);
    };
    window.addEventListener("beforeinstallprompt", ready);
    window.addEventListener("appinstalled", done);
    return () => {
      window.removeEventListener("beforeinstallprompt", ready);
      window.removeEventListener("appinstalled", done);
    };
  }, []);
  async function request() {
    const current = event.current;
    if (!current) return "Use your browser’s install option.";
    setAvailable(false);
    try {
      await current.prompt();
      const choice = await current.userChoice;
      return choice.outcome === "accepted"
        ? "Installation requested. Check your home screen for Fix It Shop."
        : "You can use Fix It Shop in this browser or install later.";
    } catch {
      return "Use your browser’s home-screen or install option below.";
    } finally {
      event.current = null;
    }
  }
  return (
    <InstallationContext.Provider value={{ available, installed, request }}>
      {children}
    </InstallationContext.Provider>
  );
}
export function FixItInstall({ name = "Fix It Shop" }: { name?: string }) {
  const { available, installed, request } = useContext(InstallationContext),
    [message, setMessage] = useState("");
  return (
    <div>
      {installed && (
        <p role="status">
          You’re viewing this page in an installed app window. Check the icon
          and name on your home screen to confirm which app you opened.
        </p>
      )}
      {available && (
        <button
          className="button button-gold"
          onClick={async () => setMessage(await request())}
        >
          Install {name}
        </button>
      )}
      {message && <p role="status">{message}</p>}
    </div>
  );
}
