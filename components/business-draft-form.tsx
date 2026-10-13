"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./founder-command.module.css";
export function BusinessDraftForm({available}:{available:boolean}){
 const router=useRouter();const [pending,setPending]=useState(false),[status,setStatus]=useState("");
 async function submit(event:React.FormEvent<HTMLFormElement>){
  event.preventDefault();if(pending||!available)return;
  const fields=new FormData(event.currentTarget);setPending(true);setStatus("");
  try{
   const response=await fetch("/api/studio/businesses",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({displayName:fields.get("displayName"),slug:fields.get("slug")}),signal:AbortSignal.timeout(12000)});
   const body=await response.json();if(!response.ok)throw Error(body.error||"Business could not be prepared.");
   setStatus("Closed business draft saved. No accounts, availability or billing were activated.");router.refresh();
  }catch{setStatus("The save could not be confirmed. Refresh the directory before retrying to check whether the draft was saved.");}
  finally{setPending(false);}
 }
 return <form onSubmit={submit} className={styles.templates}><div className={styles.controls}>
 <label>Business display name<input name="displayName" required maxLength={100} disabled={!available||pending}/></label>
 <label>Business identifier<input name="slug" required pattern="[a-z0-9][a-z0-9-]{1,62}" maxLength={63} placeholder="approved-business-name" disabled={!available||pending}/></label></div>
 <p>Use the approved business identity. Memberships, professional assignments, sender configuration and booking acceptance remain separate.</p>
 <button className="button button-gold" disabled={!available||pending}>{pending?"Saving…":"Save closed draft"}</button>
 {!available&&<p>Draft creation is unavailable until the reviewed foundation migration is applied.</p>}<p role="status" aria-live="polite">{status}</p></form>;
}
