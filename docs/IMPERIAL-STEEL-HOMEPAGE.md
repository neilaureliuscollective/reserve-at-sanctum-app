# Imperial Steel — homepage material refinement

## Recovery and research

The canonical repository identifies `/discover` as the Legacy Reserve flagship. Main began at `535b8e9` (architectural ivory/green), following `af40b18` (emerald chapters) and the recovered Design 2.0 work. Those layouts, copy, images and functional journeys remain. Remote main matched the checkout; separate connected-business and Katie steel branches were not merged. GitHub PR/status APIs and the recorded production domain were inaccessible through the environment's network proxy; branch refs are not evidence of PR status.

The supplied moodboard informs material and light, not products, prices or page structure. Direct Apple, Aesop and Rolex website audits were blocked, so this work does not claim a current live competitive audit. Retrieved authoritative sources informed these decisions:

- [Porsche Design System](https://github.com/porsche-design-system/porsche-design-system): its current theme sources separate canvas/surface, meaningful contrast, focus, motion and fluid spacing. Use roles and reusable tokens rather than a different finish on every control.
- [WCAG text contrast](https://github.com/w3c/wcag/blob/main/understanding/20/contrast-minimum.html) and [non-text contrast](https://github.com/w3c/wcag/blob/main/understanding/21/non-text-contrast.html): ordinary text needs 4.5:1; meaningful control cues need 3:1. Gradients require consideration of the least favorable background. Keep steel decorative, preserve solid readable text environments and existing high-contrast control borders.
- [WCAG reduced-motion technique](https://github.com/w3c/wcag/blob/main/techniques/css/C39.html): native preference must disable nonessential motion, including pseudo-elements.
- [MDN repeating gradients](https://github.com/mdn/content/blob/main/files/en-us/web/css/reference/values/gradient/repeating-linear-gradient/index.md) and [scroll-driven animations](https://github.com/mdn/content/blob/main/files/en-us/web/css/guides/scroll-driven_animations/index.md): static layered CSS images provide grain without assets, shaders or dependencies; bounded transform-only light movement can share the existing native scroll timeline.

## Material decisions and implementation

Existing homepage Imperial Green **#12382D**, Mineral Green **#205443**, Reserve Gold **#C4912F**, ivory **#F5F1E8** and cream **#E9E0D0** stay authoritative. The screenshot's green/gold values do not replace them. No blue is introduced.

Imperial Steel **#4A5450**, shadow **#26312C**, decorative reflected light **#88958D**, and Carbon Shadow **#121417** form opt-in CSS-module tokens. Existing obsidian **#080D0B** remains the deepest foundation. Steel is a supporting frame/plinth material; green remains the brand surface, cream/ivory the editorial canvas, and gold a hairline/reflection accent. Balance follows section hierarchy rather than an unsupported universal percentage or color-psychology claim.

The brushed finish combines very low-opacity directional grain and uneven steel lighting. The editorial signature gradient travels carbon → green-undertone steel → Imperial Green with a faint warm radial reflection. The footer uses a different carbon/green depth treatment. Materials are not repeated across every card.

Changes: steel arched hero frame with a masked, scroll-controlled reflection; sculpted steel Virelis concept plinth; fine steel edges on cream product stages; carbon navigation panel and steel open-menu control; signature founder editorial background; layered green/carbon footer. Header is opaque, removing its unnecessary backdrop blur. No new dependencies, WebGL, continuous timers or animation listeners.

Preserved: ivory hero, green primary actions, typography, editorial rhythm, product and founder images, all concept/AI-image disclosures, selector scene changes, wellness pilot, links, authentication, commerce and independent business themes. The unique homepage release marker is internal and does not change shared application release identities.

## Validation and release

The public browser suite additionally verifies that the new reflection actually changes with scrolling and stops for both the manual still-mode control and reduced-motion preference. Existing checks cover ten viewport sizes, readable dark surfaces, phone CTA visibility, no overflow, navigation/keyboard behavior, scene selection, native camera movement, no-JavaScript navigation, forced colors and enlarged text. Validation passed: 172 unit tests, production build, TypeScript, public browser checks at ten sizes, and digital-member checks covering account isolation, saved routines, wellness, founder preview and Studio routing. No failures were found in these suites. There is no configured lint command.

Production uses the existing main-branch release workflow and recorded `https://www.reserveatsanctum.app/discover` target. A successful push is not proof of a successful Vercel deployment or a live visual verification; those require accessible production/status endpoints.
