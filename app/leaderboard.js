'use client';
import { useEffect, useState } from 'react';
import { GAME_VERSION } from './platformer-levels.mjs';
import { formatRaceTime } from './platformer-replay.mjs';
import { browserPlayerId } from './player-identity.mjs';

export const SCORE_ORIGIN = 'https://solvihrafn-stjornuhlaup-scores.solvi06hrafn.chatgpt.site';
export async function scoreRequest(path,body,signal) {
  if(path==='/api/runs')body={...body,playerId:browserPlayerId()};
  const timeout=AbortSignal.timeout(12000);
  const response=await fetch(SCORE_ORIGIN+path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify({version:GAME_VERSION,...body}):undefined,signal:signal?AbortSignal.any([signal,timeout]):timeout,credentials:'omit'});
  const result=await response.json();
  if(!response.ok)throw Error(result.error||'Metataflan svaraði ekki. Prófaðu aftur.');
  return result;
}
export function ScoreForm({ token,replay,timeMs,onSaved }) {
  const [name,setName]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState(false),[improved,setImproved]=useState(false);
  async function submit(event) {
    event.preventDefault();setError('');setBusy(true);
    try { const result=await scoreRequest('/api/scores',{runToken:token,name,replay});setImproved(result.improved);setSaved(true);onSaved(); }
    catch(cause){setError(cause.name==='TimeoutError'?'Metataflan svaraði ekki í tæka tíð. Prófaðu aftur.':cause.message==='Failed to fetch'?'Nettengingin brást. Prófaðu að senda aftur.':cause.message);}
    finally{setBusy(false);}
  }
  if(!token)return <p className="score-notice">Þetta var æfingaferð. Byrjaðu aftur með nettengingu til að skrá met.</p>;
  return <form className="score-form" onSubmit={submit}><div><p className="eyebrow">FJÖGUR BORÐ KLÁRUÐ</p><h3>{formatRaceTime(timeMs)}</h3><p>Skráðu tímann þinn á sameiginlegu metatöfluna.</p></div>{saved?<p className="score-success" role="status">{improved?'Nýja metið þitt er vistað!':'Ferðin er staðfest. Fyrra metið þitt var betra og heldur sætinu.'} Aðeins besti tíminn úr þessum vafra birtist.</p>:<><label htmlFor="score-name">Nafn á metatöflu</label><div className="score-form-row"><input id="score-name" value={name} onChange={event=>setName(event.target.value)} minLength={2} maxLength={18} autoComplete="off" placeholder="Nafnið þitt" required disabled={busy}/><button type="submit" disabled={busy}>{busy?'Staðfesti…':'Skrá met ↗'}</button></div><small>Nafnið og tíminn birtast opinberlega. 2–18 stafir og viðeigandi nafn.</small>{error&&<p className="score-error" role="alert">{error}</p>}</>}</form>;
}
export function Leaderboard({ refresh=0 }) {
  const [entries,setEntries]=useState([]),[legacyEntries,setLegacyEntries]=useState([]),[loading,setLoading]=useState(true),[error,setError]=useState(''),[retry,setRetry]=useState(0);
  useEffect(()=>{
    const controller=new AbortController();setLoading(true);setError('');
    scoreRequest('/api/leaderboard',null,controller.signal).then(result=>{setEntries(result.entries);setLegacyEntries(result.legacyEntries||[]);setLoading(false);}).catch(cause=>{if(cause.name!=='AbortError'){setError('Ekki tókst að sækja metatöfluna.');setLoading(false);}});
    return()=>controller.abort();
  },[refresh,retry]);
  return <details className="leaderboard" open={refresh>0?true:undefined}>
    <summary><span>Metatafla <span aria-hidden="true">↗</span></span><small>4 borð · eitt sæti á hvern vafra</small></summary>
    <div className="leaderboard-body">
      {loading?<p role="status">Sæki met…</p>:error?<p>{error} <button onClick={()=>setRetry(n=>n+1)}>Reyna aftur</button></p>:<>
        {entries.length?<ScoreTable entries={entries}/>:<p>Engin met á nýju töflunni enn. Kláraðu öll fjögur borðin til að taka þátt!</p>}
        <p className="leaderboard-note">Aðeins besti tíminn úr hverjum vafra birtist, líka þegar skipt er um nafn. Tími telst meðan leikurinn er í gangi. Leikmannsauðkenni er vistað í vafranum; annar vafri eða hreinsun vafragagna telst nýr leikmaður.</p>
        {legacyEntries.length>0&&<details className="legacy-scores"><summary>Eldri met · {legacyEntries.length}</summary><p>Met frá því áður en vafraauðkenni voru tekin í notkun. Þau eru varðveitt hér og telja ekki í nýju keppninni.</p><ScoreTable entries={legacyEntries}/></details>}
      </>}
    </div>
  </details>;
}
function ScoreTable({entries}) {
  return <table><thead><tr><th scope="col">Sæti</th><th scope="col">Nafn</th><th scope="col">Tími</th><th scope="col">Föll</th></tr></thead><tbody>{entries.map(entry=><tr key={entry.id}><td>{entry.rank<4?['🥇','🥈','🥉'][entry.rank-1]:entry.rank}</td><th scope="row">{entry.name}</th><td>{formatRaceTime(entry.timeMs)}</td><td>{entry.deaths}</td></tr>)}</tbody></table>;
}
