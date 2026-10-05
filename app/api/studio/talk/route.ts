import { after } from 'next/server';
import { z } from 'zod';
import { currentUser } from '@/lib/auth';
import { database } from '@/lib/db';
import { BookingError } from '@/lib/booking';
import { readChairJson } from '@/lib/chair-http';
import { failure, mutationOrigin } from '@/lib/http';
import { aiConfiguration, claimTurn, produceTurn } from '@/lib/reserve-coworker';
export const dynamic='force-dynamic';
export const maxDuration=60;
export async function POST(request:Request){
  try {
    mutationOrigin(request);const actor=await currentUser();
    if(!actor)throw new BookingError('Sign in to your workspace.',401);
    const input=z.object({conversation_id:z.uuid(),request_key:z.uuid(),prompt:z.string().trim().min(1).max(3000)}).strict().parse(await readChairJson(request,14000));
    const config=aiConfiguration();
    if(!config.enabled || !config.configured)throw new BookingError('Aethelios needs its secure connection activated. Your schedule and shared work remain available.',503);
    const db=await database();
    const claim=await claimTurn(db,actor,input);
    if(claim.claimed){
      after(async()=>{
        try{await produceTurn(db,claim.actor,claim.turn,claim.room);}
        catch{/* Failure is persisted with a safe error code; never log prompt/provider bodies. */}
      });
    }
    return Response.json({turn:claim.turn},{status:claim.turn.status==='pending'?202:200,headers:{'Cache-Control':'no-store'}});
  }catch(e){return failure(e);}
}
