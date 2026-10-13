import { currentUser } from "@/lib/auth";
import { database } from "@/lib/db";
import { BookingError } from "@/lib/booking";
import { failure, mutationOrigin } from "@/lib/http";
import { readChairJson } from "@/lib/chair-http";
import { businessDirectory, prepareBusiness } from "@/lib/business-management";
export const dynamic="force-dynamic";
async function actor(){const user=await currentUser();if(!user)throw new BookingError("Sign in to Founder Command.",401);return user;}
export async function GET(){try{const user=await actor();return Response.json({businesses:await businessDirectory(await database(),user)},{headers:{"Cache-Control":"no-store"}});}catch(e){return failure(e);}}
export async function POST(req:Request){try{mutationOrigin(req);const user=await actor();return Response.json(await prepareBusiness(await database(),user,await readChairJson(req)),{status:201,headers:{"Cache-Control":"no-store"}});}catch(e){return failure(e);}}
