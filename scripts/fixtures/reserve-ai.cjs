// Deterministic browser transport fixture, explicitly isolated from real accounts.
if (process.env.NODE_ENV === 'production' || process.env.DATABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.RESERVE_DEV_PREVIEW !== 'true' || process.env.OPENAI_API_KEY !== 'reserve-fixture-not-a-key') {
  throw new Error('Reserve AI fixture requires an isolated nonproduction preview.');
}
const original = globalThis.fetch;
globalThis.fetch = async function(input, init) {
  if (String(input) !== 'https://api.openai.com/v1/responses') return original(input, init);
  const request = JSON.parse(init.body);
  const read = request.input.find(item => item.type === 'function_call_output');
  const output = read
    ? [{type:'message',content:[{type:'output_text',text:'Synthetic transport verification: review the recorded work, then prepare the next visit in the native workspace. No action has been taken.'}]}]
    : [{type:'function_call',name:'read_work',arguments:'{}',call_id:'fixture-read-work'}];
  return Response.json({status:'completed',output,usage:{input_tokens:10,output_tokens:20}});
};
