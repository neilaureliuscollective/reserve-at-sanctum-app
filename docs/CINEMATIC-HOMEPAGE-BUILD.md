# Reserve cinematic homepage rebuild — September 26, 2026

## Experience and source boundaries

The public journey is a continuous imagined place, with the entrance, hall, Katie's blue craft room, Neil's green ritual alcove, Legacy Reserve display, and Louisiana exit. The generated hall and product chamber are explicitly marked concept environments. Existing concept frames of the threshold, craft, ritual and Eunice provide other viewpoints. No generated scene claims to photograph the real site or founders.

The supplied Reserve, Fix It Shop and Gent Ascend artwork remains the master source. `scripts/prepare-cinematic-assets.py` creates a transparent alpha matte from those original pixels; it does not redraw a logo, relabel a product, or recolor packaging. The image generation transparent-seal exploration was used to validate the visual direction, but the site uses cutouts from original artwork for fidelity. The five packaging mockups are isolated against alpha and placed over an empty concept product chamber. Their labels are still the supplied images. Both original and derived files are in the repository.

## Storyboard and behavior

1. Arrival: existing first scene and headline with a transparent gold Reserve seal; the first CTA lands at the real `#your-way` destination.
2. Threshold: a sticky stage opens the foreground stone doors; the outside image moves toward and dissolves into the generated hall. The scene copy yields to the Reserve's two-world premise.
3. Encounter: the hall remains the spatial anchor. Camera shift and light reveal Katie's blue room, retreat to the hall, then reveal Neil's green room. Partner emblems are small supporting identifiers, never pasted square photos.
4. Your way: selecting craft, ritual or Reserve swaps the whole room image, light and in-viewport destination copy. The CTA remains visible and keyboard reachable.
5. Collection: an empty petrol stone chamber receives isolated original package mockups. Selection replaces the object and details. It is a preview, not a shop or live stock claim.
6. Home: the view opens to Louisiana, with a framed transition to visits and the place.

`app/page.tsx` owns semantic server-rendered narrative and links. `components/reserve-journey.tsx` attaches one passive scroll listener and one animation frame update to visible sticky stages; each stage receives bounded progress values rather than a generic repeated parallax. CSS stages live in `app/reserve-cinema-v2.css`. `components/reserve-product-gallery.tsx` keeps only product choice state client-side. Native scrolling remains in control. The still setting and OS reduced-motion preference show a linear, readable layout with both Katie and Neil's stories instead of hiding chapters.

The implementation uses small transform and opacity changes in staged layers rather than a full-time WebGL scene. CSS `animation-timeline` alone remains uneven across browsers; GSAP could manage the same timelines but would add a dependency without changing this specific four-stage progress model. Research: [GSAP ScrollTrigger](https://gsap.com/docs/v3/Plugins/ScrollTrigger/), [MDN animation-timeline support](https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Properties/animation-timeline), [web.dev animation performance](https://web.dev/articles/animations-and-performance), [web.dev reduced motion](https://web.dev/articles/prefers-reduced-motion).

Booking, auth, staff and database code are outside this homepage build. Public operational status remains visible. No product checkout is inferred from concept packaging.
