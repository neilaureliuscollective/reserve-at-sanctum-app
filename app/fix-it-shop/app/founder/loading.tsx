import FounderPage from "./page";

// The existing app streams its loading boundary. Without JavaScript the final
// stream cannot replace that boundary, so provide the same static story here.
export default function FounderLoading() {
  return <>
    <div className="founder-loading" role="status">Opening Katie’s story…</div>
    <noscript>
      <style>{`.founder-loading{display:none}.founder-noscript button{display:none}`}</style>
      <div className="founder-noscript"><FounderPage /></div>
    </noscript>
  </>;
}
