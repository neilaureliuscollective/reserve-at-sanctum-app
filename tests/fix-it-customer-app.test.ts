import { test } from "node:test";
import assert from "node:assert/strict";
import { CARD_KEY, parseCard, saveCard, deleteCard, emptyCard, viewFromHash } from "../public/fix-it-shop-app/state.mjs";

test("consultation parsing accepts only bounded versioned text and drops unrelated data", () => {
  const card = parseCard(JSON.stringify({version:1,change:"Less length",keep:"Texture",questions:"What should I ask?",email:"never retained",appointment:"not a booking"}));
  assert.deepEqual(card,{version:1,change:"Less length",keep:"Texture",questions:"What should I ask?"});
  for (const value of [null,{}, {version:2,change:"",keep:"",questions:""},{version:1,change:123,keep:"",questions:""},{version:1,change:"x".repeat(601),keep:"",questions:""}])
    assert.equal(parseCard(JSON.stringify(value)),null);
  assert.equal(parseCard("not json"),null);
});
test("saving is optional, idempotent and isolated from other browser records; deletion removes only this card", () => {
  const map = new Map([["unrelated-private-key","preserved"]]);
  const storage = {setItem:(key:string,value:string)=>{map.set(key,value);},removeItem:(key:string)=>{map.delete(key);}};
  assert.equal(saveCard(storage,emptyCard()),false);
  const card={...emptyCard(),questions:"Synthetic question"};
  assert.equal(saveCard(storage,card),true);assert.equal(saveCard(storage,card),true);
  assert.equal(map.size,2);const loaded=parseCard(map.get(CARD_KEY)!);assert.ok(loaded);assert.equal(loaded.questions,card.questions);
  deleteCard(storage);assert.equal(map.has(CARD_KEY),false);assert.equal(map.get("unrelated-private-key"),"preserved");
});
test("device storage failures cannot be reported as successful saves or deletions", () => {
  const error=Error("Storage blocked");const storage={setItem:()=>{throw error;},removeItem:()=>{throw error;}};
  assert.throws(()=>saveCard(storage,{...emptyCard(),change:"Synthetic"}),e=>e===error);
  assert.throws(()=>deleteCard(storage),e=>e===error);
});
test("screen state remains a bounded local route, including unknown/deep-link recovery", () => {
  for(const view of ["home","services","card","show","shop","katie","visit"])assert.equal(viewFromHash("#"+view),view);
  for(const input of ["","#unknown","#//evil.invalid","#<script>","#card?appointment=confirmed"])assert.equal(viewFromHash(input),"home");
});
