"use client";
import { useEffect } from "react";
import { usePathname } from "next/navigation";

const roots = 'main[data-lr-flagship], main.founder-world, main.katie-cinema, main.digital-reserve, main.vitalis-environment, main.sanctum-hub';
const flagshipTargets = '[aria-label="The Reserve standard"] > div, #pathways > div, #the-collection > header, #the-collection > div, [aria-labelledby="philosophy-title"] > div, [aria-labelledby="philosophy-title"] > figure, [aria-labelledby="wellness-title"] > div, [aria-labelledby="membership-title"] > div';

/** Shared public choreography; native scrolling and readable server HTML stay authoritative. */
export function ArrivalMotion() {
 const path = usePathname();
 useEffect(() => {
  if (!('IntersectionObserver' in window)) return;
  const media = matchMedia('(prefers-reduced-motion: reduce)');
  const contrast = matchMedia('(forced-colors: active)');
  const elements = new Set<HTMLElement>();
  const scenes = new Set<HTMLElement>();
  const initialized = new Set<HTMLElement>();
  const visibleScenes = new Set<HTMLElement>();
  let frame = 0;
  const still = () => media.matches || contrast.matches || document.documentElement.dataset.reserveStill === 'true';
  const settle = (element: HTMLElement) => {
   element.dataset.lrArrival = 'settled';
   observer.unobserve(element);
  };
  const observer = new IntersectionObserver(entries => {
   for (const entry of entries) {
    if (!entry.isIntersecting) continue;
    const element = entry.target as HTMLElement;
    // Restored scroll positions and deep links must never wait for a performance.
    element.dataset.lrArrival = still() || entry.boundingClientRect.top < innerHeight * .18 ? 'settled' : 'arriving';
    observer.unobserve(element);
   }
  }, { threshold: 0, rootMargin: '0px 0px -12% 0px' });
  const update = () => {
   frame = 0;
   for (const scene of visibleScenes) {
    const rect = scene.getBoundingClientRect();
    const progress = Math.min(1, Math.max(0, (innerHeight - rect.top) / (innerHeight + rect.height)));
    scene.style.setProperty('--lr-camera', still() ? '0' : ((.5 - progress) * 2).toFixed(4));
   }
  };
  const request = () => { if (!frame) frame = requestAnimationFrame(update); };
  const sceneObserver = new IntersectionObserver(entries => {
   for (const entry of entries) {
    const scene = entry.target as HTMLElement;
    if (entry.isIntersecting) visibleScenes.add(scene); else visibleScenes.delete(scene);
   }
   request();
  }, { rootMargin: '80px' });
  const prepare = () => {
   for (const main of document.querySelectorAll<HTMLElement>(roots)) {
    // Suspense can mount content inside a hidden container: zero rectangles aren't arrivals.
    if (initialized.has(main) || !main.getClientRects().length || main.getBoundingClientRect().height === 0) continue;
    initialized.add(main);
    const flagship = main.hasAttribute('data-lr-flagship');
    const targets = flagship ? [...main.querySelectorAll<HTMLElement>(flagshipTargets)] :
     [...main.querySelectorAll<HTMLElement>(':scope > section:not(:first-of-type):not(.katie-film) > :is(div,header,figure,article), :scope > section:not(:first-of-type):not(.katie-film):not(:has(> :is(div,header,figure,article))), .founder-entrances > a')]
      .filter(el => !el.matches('[aria-hidden="true"], .founder-arrival-environment') && !el.closest('.katie-film'));
    if (flagship) {
     const footer = main.parentElement?.querySelector<HTMLElement>('footer');
     if (footer) targets.push(footer);
    }
    targets.forEach((element, index) => {
     elements.add(element);
     element.dataset.lrBeat = String(index % 3);
     element.dataset.lrKind = element.matches('figure, .founder-origin-object, .katie-founder-mark') ? 'image' : element.matches('[data-direction], .founder-path-stage') ? 'panel' : 'copy';
     if (still() || element.getBoundingClientRect().top < innerHeight * .88) settle(element);
     else { element.dataset.lrArrival = 'waiting'; observer.observe(element); }
    });
    // Move only decorative photography, independently of the readable foreground.
    for (const image of main.querySelectorAll<HTMLElement>('section > figure img, .founder-portrait, .katie-hero__image')) {
     const scene = image.closest<HTMLElement>('section');
     if (!scene || scene.classList.contains('katie-film')) continue;
     image.dataset.lrDepth = 'true';
     scenes.add(scene); sceneObserver.observe(scene);
    }
    main.dataset.lrMotion = 'ready';
   }
  };
  const sync = () => {
   for (const element of elements) {
    if (still()) settle(element);
    else if (element.dataset.lrArrival === 'settled' && element.getBoundingClientRect().top >= innerHeight) {
     element.dataset.lrArrival = 'waiting'; observer.observe(element);
    }
   }
   request();
  };
  const finishArrival = (event: AnimationEvent) => {
   const target = event.target;
   if (target instanceof HTMLElement && elements.has(target) && event.animationName.startsWith('lr-')) settle(target);
  };
  const focus = (event: FocusEvent) => {
   const target = event.target as Node;
   for (const element of elements) if (element.contains(target)) settle(element);
  };
  const anchor = () => {
   if (!location.hash) return;
   let id = location.hash.slice(1);
   try { id = decodeURIComponent(id); } catch { /* Invalid fragments leave readable content intact. */ }
   const target = document.getElementById(id);
   for (const element of elements) if (target && (element.contains(target) || target.contains(element))) settle(element);
  };
  const mutation = new MutationObserver(records => {
   // Camera writes and interactive previews must not rescan the document every frame.
   const relevant = records.some(record => {
    if (record.type === 'childList') return [...record.addedNodes].some(node =>
     node instanceof HTMLElement && (node.matches(roots) || node.querySelector(roots)));
    const target = record.target;
    return target instanceof HTMLElement && (target.matches(roots) || target.querySelector(roots));
   });
   if (relevant) { prepare(); anchor(); }
  });
  mutation.observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['hidden', 'style'] });
  const preference = new MutationObserver(sync);
  preference.observe(document.documentElement, { attributes: true, attributeFilter: ['data-reserve-still'] });
  prepare(); anchor();
  media.addEventListener('change', sync); contrast.addEventListener('change', sync);
  document.addEventListener('animationend', finishArrival);
  document.addEventListener('focusin', focus); window.addEventListener('hashchange', anchor);
  window.addEventListener('scroll', request, { passive: true }); window.addEventListener('resize', request);
  return () => {
   observer.disconnect(); sceneObserver.disconnect(); mutation.disconnect(); preference.disconnect();
   media.removeEventListener('change', sync); contrast.removeEventListener('change', sync);
   document.removeEventListener('animationend', finishArrival);
   document.removeEventListener('focusin', focus); window.removeEventListener('hashchange', anchor);
   window.removeEventListener('scroll', request); window.removeEventListener('resize', request);
   if (frame) cancelAnimationFrame(frame);
   for (const element of elements) { delete element.dataset.lrArrival; delete element.dataset.lrBeat; delete element.dataset.lrKind; }
   for (const scene of scenes) { scene.style.removeProperty('--lr-camera'); scene.querySelectorAll<HTMLElement>('[data-lr-depth]').forEach(image => delete image.dataset.lrDepth); }
   for (const main of initialized) delete main.dataset.lrMotion;
  };
 }, [path]);
 return null;
}
