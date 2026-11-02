import { moves } from "./offseason-moves.js";

export async function arrivalsResponse(req,res) {
  const team=String(req.query.arrivals);
  res.setHeader("Cache-Control","no-store");
  if(!Object.hasOwn(moves,team)) return res.status(400).json({error:"Unknown club"});
  try {
    const r=await fetch("https://api-web.nhle.com/v1/club-stats/"+team+"/20262027/2",
      {signal:AbortSignal.timeout(10000)});
    if(!r.ok) throw Error("NHL club stats unavailable");
    const {skaters}=await r.json();
    if(!Array.isArray(skaters)) throw Error("Incomplete club response");
    const ids=new Set(moves[team].added.map(Number));
    const players=skaters.filter(p=>ids.has(Number(p.playerId))).map(p=>{
      const {gamesPlayed:gp,goals,assists,points}=p;
      if(![gp,goals,assists,points].every(n=>Number.isInteger(n)&&n>=0))
        throw Error("Incomplete player totals");
      return {id:p.playerId,team,name:[p.firstName?.default,p.lastName?.default].filter(Boolean).join(" ")||String(p.playerId),gp,goals,assists,points};
    }).filter(p=>p.gp>0);
    res.setHeader("Cache-Control","public, max-age=0, s-maxage=1800");
    return res.status(200).json({team,players});
  } catch {return res.status(502).json({error:"Club statistics temporarily unavailable"});}
}
