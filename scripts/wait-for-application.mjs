/** Next's process-ready banner is not application-route readiness. Cold route
 * compilation can exceed the browser fetch budget; verify the actual read-only
 * routes before starting assertions. Never retry a mutation or a test assertion. */
export async function waitForApplication(origin) {
  const deadline=Date.now()+60000;
  let last='No response';
  while(Date.now()<deadline){
    try{
      const response=await fetch(origin+'/api/session',{signal:AbortSignal.timeout(10000)});
      const data=await response.json();
      if(response.ok && Object.hasOwn(data,'user')){
        for(const path of ['/api/availability','/api/locations']){
          const read=await fetch(origin+path,{signal:AbortSignal.timeout(15000)});
          const payload=await read.json();
          if(!read.ok||payload.error)throw Error(`${path}: ${read.status} ${payload.error||''}`);
        }
        return;
      }
      last=`Session route: ${response.status}`;
    }catch(error){last=String(error);}
    await new Promise(resolve=>setTimeout(resolve,200));
  }
  throw Error('Application routes did not become ready: '+last);
}
