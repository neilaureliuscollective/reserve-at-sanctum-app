import { z } from 'zod';
import { currentUser } from '@/lib/auth';
import { database } from '@/lib/db';
import { BookingError } from '@/lib/booking';
import { readChairJson } from '@/lib/chair-http';
import { failure, mutationOrigin } from '@/lib/http';
import { knowledge, confirmFact, retireFact } from '@/lib/business-knowledge';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store'};
async function actor(){const user=await currentUser();if(!user)throw new BookingError('Sign in to your workspace.',401);return user;}
export async function GET(){try{return Response.json(await knowledge(await database(),await actor()),{headers});}catch(e){return failure(e);}}
export async function POST(request:Request){
  try{
    mutationOrigin(request);const user=await actor();
    const input=z.object({lane:z.enum(['reserve','fix-it','gent']),title:z.string().trim().min(1).max(120),body:z.string().trim().min(1).max(2000),source:z.string().trim().min(1).max(500),review_at:z.iso.datetime({offset:true}).nullable().optional()}).strict().parse(await readChairJson(request,14000));
    return Response.json({fact:await confirmFact(await database(),user,input)},{status:201,headers});
  }catch(e){return failure(e);}
}
export async function DELETE(request:Request){
  try{
    mutationOrigin(request);const user=await actor();
    const input=z.object({id:z.uuid(),revision:z.number().int().positive()}).strict().parse(await readChairJson(request));
    return Response.json({fact:await retireFact(await database(),user,input.id,input.revision)},{headers});
  }catch(e){return failure(e);}
}
