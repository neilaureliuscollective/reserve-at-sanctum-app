import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const read=(p:string)=>readFileSync(p,"utf8");
test("public Home uses the real emblem and preserves the dedicated founder portrait",()=>{
 const home=read("app/fix-it-shop/app/page.tsx");
 assert.doesNotMatch(home,/FounderFeature|FounderPortrait|katie-guidry\.webp/);
 assert.match(home,/id="katie"/);assert.match(home,/identity\/hero-emblem-560.webp/);
 assert.match(home,/href="\/fix-it-shop\/app\/founder"/);
 assert.match(read("app/fix-it-shop/app/founder/page.tsx"),/<FounderPortrait priority/);
 assert.match(read("lib/founder-content.ts"),/\/images\/founder\/katie-guidry.webp/);
});
test("visual layer is imported only by the Fix It Shop layout and uses tenant selectors",()=>{
 assert.match(read("app/fix-it-shop/app/layout.tsx"),/import "\.\/warm-steel.css"/);
 assert.doesNotMatch(read("app/layout.tsx"),/warm-steel/);
 const css=read("app/fix-it-shop/app/warm-steel.css");
 assert.doesNotMatch(css,/(?:^|\n)\s*(?:body|:root|html)\s*\{/);
 assert.match(css,/\.fix-it-app\.fix-it-premium/);
});
test("booking destination and guide disclosure stay intact",()=>{
 assert.match(read("lib/fix-it-public-booking.ts"),/href: "https:\/\/fixitshop.glossgenius.com\/"/);
 const html=read("public/fix-it-shop-app/index.html");
 for(const link of html.matchAll(/href="([^"]+)" data-book/g)) assert.equal(link[1],"https://fixitshop.glossgenius.com/");
 assert.match(html,/Only on this device · Not sent to Katie · No account needed/);
 assert.match(read("app/fix-it-shop/app/book/page.tsx"),/redirect\(fixItPublicBooking.href\)/);
});
