import test from 'node:test';
import assert from 'node:assert/strict';
import { katieVisitPresentation } from '../lib/experience/katie-world';
import type { SanctumDestination } from '../lib/experience/sanctum-directory';
const service={id:'cut',name:'Published service',description:'Approved description',minutes:45,price:3200};
const destination=(overrides:Partial<SanctumDestination>={}):SanctumDestination=>({id:'eunice',name:'Eunice',short_name:'Eunice',city:'Eunice',region:'Louisiana',timezone:'America/Chicago',address:'Verified address',enabled:true,booking_enabled:true,status:'operating',poster:'',crest:'',professionals:[{id:'katie',name:'Katie',services:[service]}],...overrides});
test('Katie’s public menu requires both a published destination and her own services',()=>{
 for(const house of [destination({enabled:false}),destination({booking_enabled:false}),destination({professionals:[{id:'another',name:'Other professional',services:[service]}]}),destination({professionals:[{id:'katie',name:'Katie',services:[]} ]})]){
  const state=katieVisitPresentation([house]);assert.equal(state.state,'preparing');assert.deepEqual(state.locations,[]);assert.equal(state.primary.href,'#services');
 }
 assert.equal(katieVisitPresentation([]).state,'preparing');
});
test('Katie’s handoff preserves provider, destination and service without exposing other professionals',()=>{
 const house=destination({id:'house & two',professionals:[{id:'another',name:'Other',services:[{...service,id:'foreign'}]},{id:'katie',name:'Katie',services:[{...service,id:'hair & care',private_note:'never public'} as typeof service]}]});
 const state=katieVisitPresentation([house]);assert.equal(state.state,'open');
 const url=new URL(state.locations[0].services[0].href,'https://example.test');
 assert.equal(url.searchParams.get('provider'),'katie');assert.equal(url.searchParams.get('location'),'house & two');assert.equal(url.searchParams.get('service'),'hair & care');
 assert.equal(state.locations[0].services.length,1);assert.equal('private_note' in state.locations[0].services[0],false);
 assert.equal(state.locations[0].services[0].price,3200);
});
test('A failed read suppresses stale services and booking invitations',()=>{
 const state=katieVisitPresentation([destination()],true);assert.equal(state.state,'unavailable');assert.deepEqual(state.locations,[]);assert.equal(state.primary.href,'#services');assert.ok(!state.primary.label.includes('Book with'));
});
