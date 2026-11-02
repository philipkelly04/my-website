// Explicitly tracked offseason acquisitions, not everyone on the current roster.
// Add verified final destination clubs here. Matching uses the NHL display name.
export const tracked = {
  ANA: ["Laurent Brossoit"], EDM: ["Frederik Andersen"], FLA: ["Akira Schmid"], OTT: ["Samuel Ersson"],
  PHI: ["Joseph Woll"], TOR: ["Sergei Bobrovsky"], WPG: ["Stuart Skinner", "Nico Daws"],   NJD: ["Connor Hellebuyck"],
};
export async function goalieArrivalsResponse(req,res) {
  const results=await Promise.allSettled(Object.entries(tracked).map(async ([team,names])=>{
    const r=await fetch("https://api-web.nhle.com/v1/club-stats/"+team+"/20262027/2",{signal:AbortSignal.timeout(8000)});
    if(!r.ok) throw Error("NHL request failed");
    const {goalies}=await r.json();
    if(!Array.isArray(goalies)) throw Error("Missing goalies");
    const players=[];
    for(const p of goalies){
      const name=[p.firstName?.default,p.lastName?.default].filter(Boolean).join(" ");
      const trackedName = name === "Nicolas Daws" ? "Nico Daws" : name;
if (!names.includes(trackedName)) continue;
      const shots=p.shotsAgainst, gp=p.gamesPlayed;
      if(!Number.isInteger(shots)||shots<0) throw Error("Missing shots");
      if(!shots) continue;
      const saves=p.saves ?? (Number.isInteger(p.goalsAgainst)?shots-p.goalsAgainst:null);
      if(!Number.isInteger(saves)||saves<0||saves>shots||!Number.isInteger(gp)||gp<1) throw Error("Invalid counts");
      players.push({name,team,shots,saves,gp,sv:saves/shots});
    }
    return players;
  }));
  const missing=Object.keys(tracked).filter((t,i)=>results[i].status==="rejected");
  res.setHeader("Cache-Control",missing.length?"no-store":"public, max-age=0, s-maxage=1800");
  return res.status(missing.length===results.length?502:200).json({
    players:results.flatMap(r=>r.status==="fulfilled"?r.value:[]),missing,
    trackedCount:Object.values(tracked).flat().length
  });
}
