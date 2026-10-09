# Fix It Shop customer app — cinematic home and official app symbol

The installable customer entrance is `/fix-it-shop/app`; `/fix-it-shop` is the separate public story page. The previous app home used a crest-led introduction, three short principles, service rows and return links. This release brings Katie’s independent men's salon story into the customer entrance.

## Experience

An environmental hero leads into Katie's founder story, the care behind her approach, three spatially transitioning visit scenes, the published service menu, an interactive pace preview, and a return/install chapter. Blue, obsidian, champagne gold and restrained steel retain her independent identity. Mobile booking is accessible without completing the story. The existing provider-scoped booking, account ownership, appointment management, auth and Studio logic remain authoritative. No services, prices, client results, testimonials or operating details are invented.

The service menu reads existing published data and distinguishes open, preparing and unavailable states. The pace selector changes its visible response and decorative geometry within the current phone viewport; it is explicitly a preview, with saving/sharing handled by the existing Chair. Motion progressively enhances readable server content, uses a passive scroll listener and requestAnimationFrame, and offers a still view. Reduced-motion and no-JavaScript states present all three chapters normally. Existing concept imagery is labeled; it does not depict Katie, her work, clients or the completed location.

Research: [Aesop experiences](https://www.aesop.com/experience.html), [Aesop facial appointments](https://shop.aesop.com/fr/en/r/facial-appointments/), and [web.dev motion accessibility](https://web.dev/learn/accessibility/motion). These informed service storytelling and accessible motion; no competitor animation or conversion metrics were measured.

## Official phone symbol

The user supplied `2126.png` and explicitly requested removal of all text, preservation of its design, brushed-steel detailing, realism and transparency. The image-generation edit retains the circular gold badge, architectural columns/arch, ascending pillars, central star and outer diamond accents. The generated transparent master remains available as a delivered artifact. Phone exports are in `public/fix-it-shop/app/icons`: 192/512 transparent PNGs, an opaque navy 180px Apple icon, and a 512px maskable icon with the mark within its safe region. The opaque platform exports retain the same symbol; the master has true alpha transparency.

`katieBrandIcon` now serves the official phone symbol independently of the published text-bearing marketing logo. Metadata, manifest and installation preview use versioned symbol URLs. The PWA's identity, scope, start URL and account behavior stay unchanged. Operating systems may require removal and reinstallation to refresh an existing home-screen icon.

## Verification

Local TypeScript and the existing Fix It booking/Katie presentation tests passed. The local Next build compiled, but its TypeScript CLI subprocess could not provide parseable configuration in the restricted executor. The connected Vercel preview production build completed READY without bypassing type checks.

A temporary Vercel Sandbox ran Playwright against that deployment. Checks passed at 320, 390, 540, 768, 884 and 1440px: no horizontal overflow; hero booking CTA within the viewport; all three scroll-controlled scenes and their visibility; all three pace choices and in-viewport responses; manual still mode; reduced motion; no-JavaScript chapters; manifest identity; PNG dimensions/signatures for all advertised icons; the branded booking route; and no browser page errors. No real appointments were created. Physical-phone installation and OS icon refresh were not tested. Screenshots were generated, but the temporary sandbox expired before retrieval, so this report does not claim a human visual review of those screenshots.

Integration applies only the Katie homepage, icon routes/metadata, icon assets and this document to the current main tree, preserving concurrent flagship changes. Release status and actual production HTML must be checked separately from a successful preview build.
