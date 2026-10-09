"use client";
import { useState, type FormEvent } from "react";
import Link from "next/link";
import type { BrandProfile } from "@/lib/provider-brands";
import {
  katieProfile,
  brandIdentity,
  logoFor,
  brandAsset,
} from "@/lib/provider-brand-display";
// Domain imports used below are pure projection helpers; server mutation functions are never invoked here.
export type StudioBrandProvider = {
  id: string;
  name: string;
  enabled: boolean;
  revision: number;
  slug: string | null;
  draft: BrandProfile | null;
  published: BrandProfile | null;
  brand_revision: number | null;
  published_revision: number | null;
  services: number;
  staff: number;
  upcoming: number;
  locations: string[];
};
export type StudioBrandData = {
  owner: boolean;
  providers: StudioBrandProvider[];
  locations: {
    id: string;
    name: string;
    city: string;
    region: string;
    enabled: boolean;
    booking_enabled: boolean;
    status: string;
  }[];
};
const blank: BrandProfile = {
  name: "",
  professional: "",
  title: "Independent professional",
  headline: "Your next visit.",
  bio: "",
  theme: "#14291e",
  accent: "#d4af70",
  logo: null,
  cover: null,
};
export function ProviderBrandStudio({ initial }: { initial: StudioBrandData }) {
  const [data, setData] = useState(initial),
    [selected, setSelected] = useState(initial.providers[0]?.id || ""),
    [profile, setProfile] = useState<BrandProfile>(
      initial.providers[0]?.draft || blank,
    ),
    [message, setMessage] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false),
    [review, setReview] = useState(false),
    [assigned, setAssigned] = useState<string[]>(
      initial.providers[0]?.locations || [],
    );
  const p = data.providers.find((x) => x.id === selected);
  const identity = p?.slug
    ? brandIdentity({ provider_id: p.id, slug: p.slug }, profile)
    : null;
  async function refresh(id = selected) {
    const r = await fetch("/api/studio/brands", { cache: "no-store" });
    const d = await r.json();
    if (!r.ok) throw Error(d.error);
    setData(d);
    const v = d.providers.find((x: StudioBrandProvider) => x.id === id);
    setSelected(id);
    setProfile(v?.draft || blank);
    setAssigned(v?.locations || []);
    setReview(false);
  }
  async function action(body: unknown, success: string, id = selected) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const r = await fetch("/api/studio/brands", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      await refresh(id);
      setMessage(success);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function select(id: string) {
    const v = data.providers.find((x) => x.id === id);
    setSelected(id);
    setProfile(v?.draft || blank);
    setAssigned(v?.locations || []);
    setReview(false);
    setMessage("");
    setError("");
  }
  async function create(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget),
      id = String(f.get("provider")),
      k = id === "katie";
    const pr = k
      ? katieProfile
      : {
          ...blank,
          name: String(f.get("brand")),
          professional: String(f.get("professional")),
        };
    await action(
      {
        action: "create",
        input: {
          provider: id,
          slug: k ? "fix-it-shop" : String(f.get("slug")),
          location: f.get("location"),
          profile: pr,
        },
      },
      "Private brand draft created. Booking remains controlled by approved services and availability.",
      id,
    );
  }
  async function upload(file: File | null, key: "logo" | "cover") {
    if (!file) return;
    setBusy(true);
    setError("");
    setMessage("");
    try {
      if (file.size > 500000)
        throw Error("Choose a PNG, JPEG or WebP under 500 KB.");
      const bytes = new Uint8Array(await file.arrayBuffer());
      let binary = "";
      for (const b of bytes) binary += String.fromCharCode(b);
      const r = await fetch("/api/studio/brands/assets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: selected, image: btoa(binary) }),
      });
      const d = await r.json();
      if (!r.ok) throw Error(d.error);
      setProfile((v) => ({ ...v, [key]: d.id }));
      setMessage("Image uploaded privately. Save the draft to attach it.");
      setReview(false);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const field = (key: keyof BrandProfile, value: string) => {
    setProfile((v) => ({ ...v, [key]: value }));
    setReview(false);
  };
  return (
    <div className="brand-studio">
      <header className="workspace-heading">
        <div>
          <p className="eyebrow">ONE ENGINE · INDEPENDENT BRANDS</p>
          <h1>Provider studio.</h1>
          <p>
            A focused booking identity for each professional. Draft, review and
            publish with owner approval.
          </p>
        </div>
        <Link href="/studio/operations">Services & availability ↗</Link>
      </header>
      {data.owner && (
        <details className="brand-onboard">
          <summary>Add a provider or initialize an existing brand</summary>
          <form onSubmit={create} className="brand-fields">
            <label>
              Provider identifier
              <input
                name="provider"
                required
                pattern="[a-z0-9][a-z0-9-]{1,58}[a-z0-9]"
                maxLength={60}
                placeholder="katie"
              />
            </label>
            <label>
              Brand name
              <input name="brand" maxLength={60} placeholder="Fix It Shop" />
            </label>
            <label>
              Professional name
              <input
                name="professional"
                maxLength={80}
                placeholder="Katie Guidry"
              />
            </label>
            <label>
              Booking link slug
              <input
                name="slug"
                maxLength={60}
                pattern="[a-z0-9][a-z0-9-]{1,58}[a-z0-9]"
                placeholder="fix-it-shop"
              />
            </label>
            <label>
              First location
              <select name="location" required>
                {data.locations.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.city}, {l.region}
                  </option>
                ))}
              </select>
            </label>
            <p>
              For Katie, enter “katie”. Her approved founder identity and
              existing booking URL are preserved. New providers start disabled
              with no service menu.
            </p>
            <button className="button button-gold" disabled={busy}>
              Create private draft
            </button>
          </form>
        </details>
      )}
      {data.owner && (
        <details className="brand-onboard">
          <summary>Add a location (booking closed)</summary>
          <form
            className="brand-fields"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              void action(
                { action: "create-location", input: Object.fromEntries(f) },
                "Location created with booking closed. Assign providers and review readiness before opening.",
              );
            }}
          >
            <label>
              Location identifier
              <input
                name="id"
                required
                maxLength={60}
                pattern="[a-z0-9][a-z0-9-]{1,58}[a-z0-9]"
              />
            </label>
            <label>
              Display name
              <input name="name" required maxLength={100} />
            </label>
            <label>
              City
              <input name="city" required maxLength={80} />
            </label>
            <label>
              State or region
              <input name="region" required maxLength={80} />
            </label>
            <label>
              Timezone
              <input
                name="timezone"
                required
                maxLength={80}
                defaultValue="America/Chicago"
              />
            </label>
            <label>
              Address (optional during setup)
              <input name="address" maxLength={300} />
            </label>
            <button className="button button-outline" disabled={busy}>
              Create closed location
            </button>
          </form>
        </details>
      )}
      {message && <p role="status">{message}</p>}
      {error && <p role="alert">{error}</p>}
      {!data.providers.length && (
        <p>No providers configured. Start a private onboarding draft above.</p>
      )}
      {!!data.providers.length && (
        <div className="brand-select">
          <label htmlFor="brand-provider">Provider</label>
          <select
            id="brand-provider"
            value={selected}
            disabled={busy}
            onChange={(e) => select(e.target.value)}
          >
            {data.providers.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        </div>
      )}
      {p && !p.draft && (
        <p>
          This provider has no brand draft. The owner can initialize it above
          using identifier “{p.id}”.
        </p>
      )}
      {p?.draft && identity && (
        <>
          <div className="brand-facts">
            <p>
              <strong>{p.published ? "Published" : "Private draft"}</strong>
              <br />
              Draft revision {p.brand_revision}
              {p.published_revision
                ? ` · last published draft ${p.published_revision}`
                : ""}
            </p>
            <p>
              <strong>{p.services}</strong> enabled services
              <br />
              <strong>{p.staff}</strong> assigned staff
              <br />
              <strong>{p.upcoming}</strong> upcoming appointments
            </p>
            <p>
              {p.enabled ? "Provider enabled" : "Provider disabled"}
              <br />
              {p.locations.some((id) =>
                data.locations.some(
                  (l) => l.id === id && l.enabled && l.booking_enabled,
                ),
              )
                ? "An assigned location is open"
                : "Assigned locations are closed"}
              <br />
              <Link href="/studio/operations">Review pilot readiness ↗</Link>
            </p>
          </div>
          <p className="brand-url">
            Booking link: <Link href={identity.base}>{identity.base}</Link> ·{" "}
            {p.id === "katie"
              ? "Katie’s approved identity"
              : "Link is permanent to protect shared links and installed app identity"}
          </p>
          <div className="brand-edit-grid">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                void action(
                  {
                    action: "save",
                    provider: p.id,
                    revision: p.brand_revision,
                    profile,
                  },
                  "Draft saved. The published experience has not changed.",
                );
              }}
            >
              <fieldset disabled={busy} className="brand-fields">
                <legend>Brand and professional profile</legend>
                <label>
                  Brand name
                  <input
                    value={profile.name}
                    maxLength={60}
                    required
                    readOnly={p.id === "katie"}
                    onChange={(e) => field("name", e.target.value)}
                  />
                </label>
                <label>
                  Professional name
                  <input
                    value={profile.professional}
                    required
                    maxLength={80}
                    readOnly={p.id === "katie"}
                    onChange={(e) => field("professional", e.target.value)}
                  />
                </label>
                <label>
                  Professional title
                  <input
                    value={profile.title}
                    required
                    maxLength={80}
                    readOnly={p.id === "katie"}
                    onChange={(e) => field("title", e.target.value)}
                  />
                </label>
                <label>
                  Headline
                  <input
                    value={profile.headline}
                    required
                    maxLength={120}
                    onChange={(e) => field("headline", e.target.value)}
                  />
                </label>
                <label className="brand-wide">
                  Professional biography
                  <textarea
                    value={profile.bio}
                    rows={5}
                    maxLength={1200}
                    onChange={(e) => field("bio", e.target.value)}
                  />
                </label>
                <label>
                  Dark theme color
                  <input
                    type="color"
                    value={profile.theme}
                    onChange={(e) => field("theme", e.target.value)}
                  />
                </label>
                <label>
                  Light accent color
                  <input
                    type="color"
                    value={profile.accent}
                    onChange={(e) => field("accent", e.target.value)}
                  />
                </label>
                <p className="brand-wide">
                  Colors are checked for readable contrast. Images: still PNG,
                  JPEG or WebP, under 500 KB and four million pixels. Uploaded
                  imagery stays private until publication.
                </p>
                <label>
                  Logo / home-screen icon
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) =>
                      void upload(e.target.files?.[0] || null, "logo")
                    }
                  />
                </label>
                <label>
                  Optional studio image
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    onChange={(e) =>
                      void upload(e.target.files?.[0] || null, "cover")
                    }
                  />
                </label>
                {profile.logo && (
                  <button
                    type="button"
                    onClick={() => {
                      setProfile((v) => ({ ...v, logo: null }));
                      setReview(false);
                    }}
                  >
                    Remove uploaded logo
                  </button>
                )}
                {profile.cover && (
                  <button
                    type="button"
                    onClick={() => {
                      setProfile((v) => ({ ...v, cover: null }));
                      setReview(false);
                    }}
                  >
                    Remove studio image
                  </button>
                )}
                <button className="button button-gold" type="submit">
                  Save draft
                </button>
                <Link href={`/studio/brands/preview/${p.id}`} target="_blank">
                  Preview saved draft ↗
                </Link>
              </fieldset>
            </form>
            <aside
              className="brand-live-preview"
              style={{ background: profile.theme, borderColor: profile.accent }}
              aria-label="Unsaved visual preview"
            >
              <p style={{ color: profile.accent }}>VISUAL PREVIEW · UNSAVED</p>
              {logoFor(profile, p.id, 192, true) && (
                <img
                  src={logoFor(profile, p.id, 192, true)!}
                  width={96}
                  height={96}
                  alt="Draft logo"
                />
              )}
              <h2>{profile.name}</h2>
              <p>
                {profile.professional} · {profile.title}
              </p>
              <h3>{profile.headline}</h3>
              <p className="provider-bio">{profile.bio}</p>
              {profile.cover && (
                <img
                  className="brand-cover-preview"
                  src={brandAsset(profile.cover, "image", true)}
                  alt="Draft studio"
                />
              )}
              <span
                className="brand-preview-button"
                style={{ background: profile.accent, color: "#070b10" }}
              >
                Book a visit ↗
              </span>
            </aside>
          </div>
          {data.owner && (
            <section className="brand-publishing">
              <h2>Review and publish.</h2>
              <p>
                Save first, then inspect the saved draft. Publishing updates the
                public profile and phone identity; it does not enable booking,
                assign staff or send messages.
              </p>
              <label>
                <input
                  type="checkbox"
                  checked={review}
                  disabled={busy}
                  onChange={(e) => setReview(e.target.checked)}
                />{" "}
                I reviewed the saved profile, images and ownership details.
              </label>
              <div className="brand-actions">
                <button
                  className="button button-gold"
                  disabled={busy || !review}
                  onClick={() =>
                    void action(
                      {
                        action: "publish",
                        provider: p.id,
                        revision: p.brand_revision,
                      },
                      "Brand published. Booking readiness is unchanged.",
                    )
                  }
                >
                  Publish saved draft
                </button>
                {p.published && (
                  <button
                    className="button button-outline"
                    disabled={busy || !review}
                    onClick={() =>
                      void action(
                        {
                          action: "unpublish",
                          provider: p.id,
                          revision: p.brand_revision,
                        },
                        p.id === "katie"
                          ? "Customizations unpublished. Katie’s approved Fix It Shop foundation remains available."
                          : "Brand unpublished. Existing appointments remain in the shared account.",
                      )
                    }
                  >
                    Unpublish customizations
                  </button>
                )}
              </div>
            </section>
          )}
          {!data.owner && (
            <p>
              Only the platform owner can publish your saved draft or change
              location assignments.
            </p>
          )}
          {data.owner && (
            <section className="brand-locations">
              <h2>Assigned locations.</h2>
              <p>
                Scheduling hours and service changes stay in Operations.
                Removing a location with future confirmed visits is blocked.
              </p>
              {data.locations.map((l) => (
                <label key={l.id}>
                  <input
                    type="checkbox"
                    checked={assigned.includes(l.id)}
                    disabled={busy}
                    onChange={(e) =>
                      setAssigned((v) =>
                        e.target.checked
                          ? [...v, l.id]
                          : v.filter((id) => id !== l.id),
                      )
                    }
                  />
                  {l.city}, {l.region} ·{" "}
                  {l.booking_enabled && l.enabled ? "Booking open" : "Closed"}
                </label>
              ))}
              <button
                className="button button-outline"
                disabled={busy || !assigned.length}
                onClick={() =>
                  void action(
                    {
                      action: "locations",
                      provider: p.id,
                      revision: p.revision,
                      locations: assigned,
                    },
                    "Provider locations updated. Existing appointments were preserved.",
                  )
                }
              >
                Save location assignments
              </button>
            </section>
          )}
        </>
      )}
    </div>
  );
}
