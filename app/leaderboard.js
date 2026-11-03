'use client';
import { useEffect, useState } from 'react';
import { GAME_VERSION } from './platformer-levels.mjs';
import { formatRaceTime } from './platformer-replay.mjs';

export const SCORE_ORIGIN = 'https://solvihrafn-stjornuhlaup-scores.solvi06hrafn.chatgpt.site';
export async function scoreRequest(path,body,signal) {
  const timeout=AbortSignal.timeout(12000);
  const response=await fetch(SCORE_ORIGIN+path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify({version:GAME_VERSION,...body}):undefined,signal:signal?AbortSignal.any([signal,timeout]):timeout,credentials:'omit'});
  const result=await response.json();
  if(!response.ok)throw Error(result.error||'Metataflan svaraði ekki. Prófaðu aftur.');
  return result;
}
export function ScoreForm({ token,replay,timeMs,onSaved }) {
  const [name,setName]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState(false);
  async function submit(event) {
    event.preventDefault();setError('');setBusy(true);
    try { await scoreRequest('/api/scores',{runToken:token,name,replay});setSaved(true);onSaved(); }
    catch(cause){setError(cause.name==='TimeoutError'?'Metataflan svaraði ekki í tæka tíð. Prófaðu aftur.':cause.message==='Failed to fetch'?'Nettengingin brást. Prófaðu að senda aftur.':cause.message);}
    finally{setBusy(false);}
  }
  if(!token)return <p className="score-notice">Þetta var æfingaferð. Byrjaðu aftur með nettengingu til að skrá met.</p>;
  return <form className="score-form" onSubmit={submit}><div><p className="eyebrow">FJÖGUR BORÐ KLÁRUÐ</p><h3>{formatRaceTime(timeMs)}</h3><p>Skráðu tímann þinn á sameiginlegu metatöfluna.</p></div>{saved?<p className="score-success" role="status">Metið þitt er vistað! Besti tími hvers nafns birtist í töflunni.</p>:<><label htmlFor="score-name">Nafn á metatöflu</label><div className="score-form-row"><input id="score-name" value={name} onChange={event=>setName(event.target.value)} minLength={2} maxLength={18} autoComplete="off" placeholder="Nafnið þitt" required disabled={busy}/><button type="submit" disabled={busy}>{busy?'Staðfesti…':'Skrá met ↗'}</button></div><small>Nafnið og tíminn birtast opinberlega. 2–18 stafir og viðeigandi nafn.</small>{error&&<p className="score-error" role="alert">{error}</p>}</>}</form>;
}
export function Leaderboard({ refresh=0 }) {
  const [entries,setEntries]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[retry,setRetry]=useState(0);
  useEffect(()=>{
    const controller=new AbortController();setLoading(true);setError('');
    scoreRequest('/api/leaderboard',null,controller.signal).then(result=>{setEntries(result.entries);setLoading(false);}).catch(cause=>{if(cause.name!=='AbortError'){setError('Ekki tókst að sækja metatöfluna.');setLoading(false);}});
    return()=>controller.abort();
  },[refresh,retry]);
  return <details className="leaderboard" open={refresh>0?true:undefined}><summary><span>Metatafla <span aria-hidden="true">↗</span></span><small>4 borð · hraðasti tíminn vinnur</small></summary><div className="leaderboard-body">{loading?<p role="status">Sæki met…</p>:error?<p>{error} <button onClick={()=>setRetry(n=>n+1)}>Reyna aftur</button></p>:entries.length?<><table><thead><tr><th scope="col">Sæti</th><th scope="col">Nafn</th><th scope="col">Tími</th><th scope="col">Föll</th></tr></thead><tbody>{entries.map(entry=><tr key={entry.id}><td>{entry.rank<4?['🥇','🥈','🥉'][entry.rank-1]:entry.rank}</td><th scope="row">{entry.name}</th><td>{formatRaceTime(entry.timeMs)}</td><td>{entry.deaths}</td></tr>)}</tbody></table><p className="leaderboard-note">Besti tími hvers nafns. Tími telst meðan leikurinn er í gangi. Ferðin er yfirfarin áður en met er vistað.</p></>:<p>Engin met enn. Verður þú fyrstur til að klára öll fjögur borðin?</p>}</div></details>;
}
