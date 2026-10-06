'use client';

/** Root failures cannot depend on the failed layout, its CSS, or its router. */
export default function GlobalError() {
  return <html lang="en"><body style={{margin:0,background:'#070909',color:'#e7ece8',fontFamily:'Arial, sans-serif'}}>
    <main style={{minHeight:'100svh',boxSizing:'border-box',padding:'64px 24px',maxWidth:640,margin:'auto'}}>
      <p style={{color:'#E0BB6A',letterSpacing:3}}>LEGACY RESERVE</p>
      <h1>Your entrance needs a refresh.</h1>
      <p>The app couldn’t finish opening. Reload the home experience to try again.</p>
      <a href="/home" style={{display:'inline-block',background:'#C4912F',color:'#070908',padding:'18px 24px',marginTop:16}}>Reload Legacy Reserve</a>
      <p><a href="/setup?help=1" style={{color:'#E0BB6A'}}>Install help</a></p>
    </main>
  </body></html>;
}
