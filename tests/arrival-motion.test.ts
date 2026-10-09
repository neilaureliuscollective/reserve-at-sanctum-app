import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';

// Exercise the actual director against DOM/observer boundaries, including hidden Suspense mounts.
function harness(hidden = false) {
  const listeners = new Map<string, (event?: unknown) => void>();
  const queries: { matches: boolean; addEventListener: Function; removeEventListener: Function }[] = [];
  const intersections: Observer[] = [];
  const mutations: { callback: Function }[] = [];
  class Element {
    dataset: Record<string,string> = {};
    top = 1100;
    hidden = false;
    style = { setProperty() {}, removeProperty() {} };
    parentElement = null;
    classList = { contains: () => false };
    constructor(public name: string) {}
    matches(selector: string) { return this.name === 'main' ? selector.includes('main') : this.name === 'figure' && selector.includes('figure'); }
    hasAttribute() { return this.name === 'main'; }
    getClientRects() { return this.hidden ? [] : [{}]; }
    getBoundingClientRect() { return { top: this.top, height: this.hidden ? 0 : 1600 }; }
    querySelectorAll(selector: string) { return this.name === 'main' && !selector.includes('img') ? [first, second] : []; }
    querySelector() { return null; }
    contains(target: Element) { return target === this; }
    closest() { return null; }
  }
  class Observer {
    observed = new Set<Element>();
    constructor(public callback: Function) { intersections.push(this); }
    observe(el: Element) { this.observed.add(el); }
    unobserve(el: Element) { this.observed.delete(el); }
    disconnect() { this.observed.clear(); }
  }
  const first = new Element('copy'); first.top = 100;
  const second = new Element('figure');
  const main = new Element('main'); main.hidden = hidden;
  const html = new Element('html');
  let cleanup: () => void = () => {};
  const exports: { ArrivalMotion?: () => void } = {};
  const context = {
    exports, HTMLElement: Element, innerHeight: 800,
    location: { hash: '' },
    requestAnimationFrame: () => 1, cancelAnimationFrame() {},
    IntersectionObserver: Observer,
    MutationObserver: class {
      constructor(public callback: Function) { mutations.push(this); }
      observe() {} disconnect() {}
    },
    matchMedia: () => { const query = { matches:false, addEventListener() {}, removeEventListener() {} }; queries.push(query); return query; },
    window: { IntersectionObserver:Observer, addEventListener(name: string, fn: Function) { listeners.set(name, fn as () => void); }, removeEventListener(name: string) { listeners.delete(name); } },
    document: {
      documentElement:html, body:new Element('body'),
      querySelectorAll: () => [main], getElementById: () => second,
      addEventListener(name: string, fn: Function) { listeners.set(name, fn as () => void); }, removeEventListener(name: string) { listeners.delete(name); },
    },
    require(name: string) {
      if (name === 'react') return { useEffect: (fn: () => () => void) => { cleanup = fn(); } };
      if (name === 'next/navigation') return { usePathname: () => '/discover' };
      throw new Error(name);
    },
  };
  const source = readFileSync(new URL('../components/flagship/arrival-motion.tsx', import.meta.url), 'utf8');
  const code = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText;
  runInNewContext(code,context); exports.ArrivalMotion!();
  return { first, second, main, html, queries, intersections, mutations, listeners, context, cleanup: () => cleanup() };
}

test('below-fold chapters arrive in view and clean up on route unmount', () => {
  const h = harness();
  assert.equal(h.first.dataset.lrArrival,'settled');
  assert.equal(h.second.dataset.lrArrival,'waiting');
  assert.equal(h.second.dataset.lrKind,'image');
  h.intersections[0].callback([{target:h.second,isIntersecting:true,boundingClientRect:{top:600}}]);
  assert.equal(h.second.dataset.lrArrival,'arriving');
  assert.equal(h.intersections[0].observed.size,0);
  h.listeners.get('animationend')!({target:h.second,animationName:'lr-image-arrive'});
  assert.equal(h.second.dataset.lrArrival,'settled');
  h.cleanup();
  assert.equal(h.second.dataset.lrArrival,undefined);
  assert.equal(h.main.dataset.lrMotion,undefined);
  assert.equal(h.listeners.size,0);
});

test('hidden streaming content waits for layout instead of settling every chapter', () => {
  const h = harness(true);
  assert.equal(h.second.dataset.lrArrival,undefined);
  h.main.hidden = false;
  h.mutations[0].callback([{type:'attributes',target:h.main}]);
  assert.equal(h.second.dataset.lrArrival,'waiting');
  assert.equal(h.main.dataset.lrMotion,'ready');
  h.cleanup();
});

test('pause exposes all content and resume rearms upcoming chapters', () => {
  const h = harness();
  h.html.dataset.reserveStill = 'true'; h.mutations[1].callback();
  assert.equal(h.second.dataset.lrArrival,'settled');
  h.html.dataset.reserveStill = 'false'; h.mutations[1].callback();
  assert.equal(h.second.dataset.lrArrival,'waiting');
  h.queries[0].matches = true; h.mutations[1].callback();
  assert.equal(h.second.dataset.lrArrival,'settled');
  h.cleanup();
});

test('keyboard focus and deep links expose their target without choreography', () => {
  const h = harness();
  h.listeners.get('focusin')!({target:h.second});
  assert.equal(h.second.dataset.lrArrival,'settled');
  h.html.dataset.reserveStill='false';h.mutations[1].callback();
  h.context.location.hash='#philosophy';h.listeners.get('hashchange')!();
  assert.equal(h.second.dataset.lrArrival,'settled');
  h.context.location.hash='#%invalid';h.listeners.get('hashchange')!();
  h.cleanup();
});
