# Brand worlds — care, craft, and a larger life

## Evidence and editorial boundaries

September 21 continuation of the recovered Reserve source, after the first
visual pass. No new project, architecture, dependencies or backend scope.

Read the September 20 Reserve-at-Sanctum-Build-Blueprint.md and August
Groomed_Gent_Co_Living_Company_Context.docx, and retrieved prior conversations.
The older company context is historical: current explicit decisions control.
Neil's current message confirms the origin in a bottle and the expansion into
men's health, wellness, care and legacy. Do not invent chronology, milestones,
customer outcomes, personal hardship, quotes or a formula-origin anecdote.

Katie: confirmed men's salon professional, Fix It Shop identity, blue/gold,
personal client care. Neil says their commitment to clients is similar; that
does not make their biographies, opinions or qualifications interchangeable.
No invented portrait, personal quotation, career length, specialty or menu.
Keep her fuller biography and approved work photography for later input.

Reserve: Neil + Katie in Eunice; two independent businesses. Aurelius serves
men and women; Reserve is the shared men's destination. Legacy Reserve is the
product brand, not a new product catalog inside this build. Future wellness
and platform ambitions must be marked as a vision, not available services.

## Design/build plan

1. Fix It: split composition with the existing salon concept image, spacious
   navy typography, a warm ivory Katie/care editorial section, and a numbered
   conversation/craft/confidence narrative. Keep booking accessible but private.
2. Aurelius: expansive dark-purple art direction, Atlas concept image, founder
   origin from grooming into broader care, and editorial chapters on care,
   discipline and contribution. Explain the Reserve relationship explicitly.
3. Connect the worlds using real routes and visible page chapter links. Tighten
   mobile homepage arrival; preserve the original cinematic image and headline.
4. Validate phone/unfolded/desktop, keyboard navigation, reduced motion and
   JavaScript-disabled reading. Rerun existing functional tests and build.

## Research applied

- https://web.dev/articles/optimize-lcp — render hero image in initial HTML,
  eagerly load only above-fold imagery, retain optimized assets and image sizes.
- https://www.w3.org/WAI/WCAG22/Understanding/animation-from-interactions.html
  — no scroll-driven displacement or required motion to reveal content.
- Installed Next 16 Image documentation: eager + fetchPriority for hero assets.
- React best practices: server-rendered stories, native anchors, no new client
  library or state for static editorial content.

These are implementation sources, not evidence of measured conversion gains.
Use existing concept art with visible labels; no new logo presented as approved.
No dates, prices, claims, testimonials or staged founder photographs invented.

## Delivery status

Completed the two distinct brand compositions, founder/care copy, chapter
navigation, connected onward journeys and the shorter mobile Arrival. Existing
booking, auth, database and dependency files were not modified.

- TypeScript passed; all 10 original tests passed; production build passed.
- Existing Chromium suite passed at 320, 390, 768, 1024 and 1440 pixels with
  one H1 and no horizontal overflow on all four public routes.
- Reserve → Fix It → Aurelius → Reserve works. Mobile menu keyboard focus,
  homepage without JavaScript, WebGL pause and reduced motion checks passed.
- Persisted booking, sign-in return, client/staff views, reschedule/cancel,
  ownership and cross-origin checks passed.
- Reviewed final Fix It and Aurelius screenshots at desktop and phone sizes,
  plus the new mobile Arrival. No physical device or Safari test is claimed.
- The available local browser is the project's existing Playwright/Chromium
  harness; agent-browser CLI is unavailable. No new browser dependency added.
- No lint command/config exists in this recovered baseline. Existing nonfatal
  Next development LCP advisory for reused Arrival imagery remains; no measured
  field performance claim.

At opening: the first visual pass was already present, including the editorial
homepage, blue/purple brand environments and working private booking routes.
Both brand pages still shared a hero/split/three-pillar layout. That repetition
is what this pass replaces, while retaining the existing project and routes.

Still needed: approved brand marks, authentic location/founder imagery, Katie's
own fuller biography and approved service content. The separate grooming app,
hosted setup and new backend work remain outside this pass. Later calendar/time
off work absent from the recovered archive is not represented as recovered.

Recovered source still has no Git history. Deliver the updated saved source
archive; no commit, GitHub push or hosted deployment is claimed.
