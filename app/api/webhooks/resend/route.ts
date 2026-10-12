import { ZodError } from "zod";
import { database } from "@/lib/db";
import { BookingError } from "@/lib/booking-error";
import { readReceiptBytes, verifyReceiptSignature, parseReceipt, recordReceipt } from "@/lib/booking-receipts";
export const dynamic = "force-dynamic";
export async function POST(request: Request) {
  const headers={"Cache-Control":"no-store"};
  const secret=process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) return Response.json({error:"Receipt verification unavailable"},{status:503,headers});
  try {
    const raw=await readReceiptBytes(request);
    const id=verifyReceiptSignature(raw,request.headers,secret);
    const receipt=parseReceipt(raw,id);
    if (!receipt) return Response.json({ignored:true},{headers});
    return Response.json(await recordReceipt(await database(),receipt),{headers});
  } catch(e) {
    if (e instanceof ZodError) return Response.json({error:"Invalid receipt"},{status:400,headers});
    if (e instanceof BookingError) return Response.json({error:e.message},{status:e.status,headers});
    console.error("Booking receipt processing unavailable");
    return Response.json({error:"Receipt processing unavailable"},{status:503,headers});
  }
}
