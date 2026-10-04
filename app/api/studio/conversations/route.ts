import { z } from 'zod';
import { currentUser } from '@/lib/auth';
import { database } from '@/lib/db';
import { BookingError } from '@/lib/booking';
import { readChairJson } from '@/lib/chair-http';
import { failure, mutationOrigin } from '@/lib/http';
import { roomIndex, roomHistory, roomContext, createRoom, revokeMember } from '@/lib/reserve-coworker';
export const dynamic='force-dynamic';
const headers={'Cache-Control':'no-store'};
async function actor(){const user=await currentUser();if(!user)throw new BookingError('Sign in to your workspace.',401);return user;}
export async function GET(request:Request){
  try {
    const user=await actor(), db=await database(), params=new URL(request.url).searchParams;
    const room=params.get('room');
    if(room){
      z.uuid().parse(room);
      if(params.get('context')==='true')return Response.json(await roomContext(db,user,room),{headers});
      const before=params.get('before')||undefined;if(before)z.iso.datetime({offset:true}).parse(before);
      return Response.json(await roomHistory(db,user,room,before),{headers});
    }
    return Response.json(await roomIndex(db,user),{headers});
  }catch(e){return failure(e);}
}
export async function POST(request:Request){
  try{
    mutationOrigin(request);const user=await actor();
    const input=z.object({title:z.string().trim().min(1).max(90),shared:z.boolean().optional(),member_id:z.string().min(1).max(100).optional()}).strict().parse(await readChairJson(request));
    return Response.json({room:await createRoom(await database(),user,input)},{status:201,headers});
  }catch(e){return failure(e);}
}
export async function DELETE(request:Request){
  try{
    mutationOrigin(request);const user=await actor();
    const input=z.object({room_id:z.uuid(),member_id:z.string().min(1).max(100)}).strict().parse(await readChairJson(request));
    await revokeMember(await database(),user,input.room_id,input.member_id);
    return Response.json({removed:true},{headers});
  }catch(e){return failure(e);}
}
