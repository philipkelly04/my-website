import { moves, teamNames } from "./offseason-moves.js";

const root = document.querySelector("#arrivals-chart");
root.innerHTML = `<h2>New forward arrivals: games played vs points</h2>
<p>2026–27 regular season · Tracked offseason forwards with at least one game for their new club. The dashed line is one point per game.</p>
<label>Highlight team <select></select></label> <button type="button">Load chart</button>
<p role="status"></p><div class="plot"></div><p class="detail" aria-live="polite"></p>`;
const select = root.querySelector("select"), button = root.querySelector("button");
const status = root.querySelector('[role="status"]'), plot = root.querySelector(".plot");
const detail = root.querySelector(".detail");
select.add(new Option("All teams", ""));
for (const [code,name] of Object.entries(teamNames).sort((a,b)=>a[1].localeCompare(b[1])))
  select.add(new Option(name,code));

const cache = new Map(), teams = Object.keys(moves).filter(t=>moves[t].added?.length);
let loaded = false;

function draw() {
  plot.replaceChildren(); detail.textContent = "";
  const players = [...cache.values()].flat();
  if (!players.length) return;
  const groups = new Map();
  for (const p of players) {
    const key = p.gp + ":" + p.points;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(p);
  }
  const ns = "http://www.w3.org/2000/svg";
  function el(tag,attrs,parent,content) {
    const e=document.createElementNS(ns,tag);
    for(const [k,v] of Object.entries(attrs)) e.setAttribute(k,v);
    if(content!==undefined) e.textContent=content;
    parent.append(e); return e;
  }
  const svg=el("svg",{viewBox:"0 0 560 320",role:"group","aria-label":"Games played on the horizontal axis and points on the vertical axis"},plot);
  svg.style.cssText="width:100%;max-width:800px;display:block;background:#15191f;border-radius:12px";
  const axisMax=(values)=>Math.max(5,Math.ceil(Math.max(...values)/5)*5);
  const mx=axisMax(players.map(p=>p.gp)), my=axisMax(players.map(p=>p.points));
  const x=n=>55+480*n/mx, y=n=>268-240*n/my;
  const line=(a,b,c,d,extra={})=>el("line",{x1:a,y1:b,x2:c,y2:d,stroke:"#46505c",...extra},svg);
  const text=(a,b,s)=>el("text",{x:a,y:b,fill:"#f5f7fa","font-size":13,"text-anchor":"middle"},svg,s);
  for(let i=0;i<=5;i++) {
    const vx=mx*i/5,vy=my*i/5;
    line(x(0),y(vy),x(mx),y(vy)); text(34,y(vy)+4,vy);
    text(x(vx),289,vx);
  }
  text(290,312,"Games played for new club"); text(35,17,"Points");
  const cap=Math.min(mx,my);
  line(x(0),y(0),x(cap),y(cap),{stroke:"#c7ced8","stroke-dasharray":"6 5"});
  const selected=select.value;
  const matches=list=>!selected||list.some(p=>p.team===selected);
  const sorted=[...groups.values()].sort((a,b)=>Number(matches(a))-Number(matches(b)));
  for(const list of sorted) {
    const p=list[0];
    const label=list.slice().sort((a,b)=>Number(b.team===selected)-Number(a.team===selected)).map(p=>
      p.name+" ("+p.team+"): "+p.gp+" GP, "+p.goals+" G, "+p.assists+" A, "+p.points+" PTS").join(" · ");
    const dot=el("circle",{cx:x(p.gp),cy:y(p.points),r:list.length>1?7:5,
      fill:matches(list)?"#f5c542":"#798391",stroke:"#101418",tabindex:0,role:"button","aria-label":label},svg);
    
    // If players share a spot, prefer the highlighted team's logo.
const markerPlayer = list.find(p => p.team === selected) || list[0];
const size = list.length > 1 ? 28 : 23;
const cx = x(p.gp);
const cy = y(p.points);

// Keep the original dot as a click target and a fallback.
dot.setAttribute("r", size / 2);
dot.setAttribute("fill", "#202a36");
dot.setAttribute(
  "stroke",
  selected && markerPlayer.team === selected ? "#f5c542" : "#526070"
);

const logo = el("image", {
  href: `https://assets.nhle.com/logos/nhl/svg/${markerPlayer.team}_dark.svg`,
  x: cx - size / 2,
  y: cy - size / 2,
  width: size,
  height: size,
  opacity: matches(list) ? 1 : 0.35,
  "pointer-events": "none",
  "aria-hidden": "true"
}, svg);

logo.addEventListener("error", () => logo.remove());

// A count makes it clear when one logo represents several forwards.
if (list.length > 1) {
  el("text", {
    x: cx + size / 2 - 1,
    y: cy - size / 2 + 4,
    fill: "#fff",
    stroke: "#101418",
    "stroke-width": 3,
    "paint-order": "stroke",
    "font-size": 12,
    "font-weight": "bold",
    "pointer-events": "none",
    "aria-hidden": "true"
  }, svg, String(list.length));
}
    
    el("title",{},dot,label);
    const show=()=>{detail.textContent=label};
    for(const event of ["click","focus","pointerenter"]) dot.addEventListener(event,show);
    dot.addEventListener("keydown",e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();show()}});
  }
  const n=players.filter(p=>!selected||p.team===selected).length;
  detail.textContent=selected&&!n ? "No appearances shown for this team in the loaded data." :
    "Tap or focus a dot for player details. Larger dots represent multiple players at the same spot.";
}

async function load() {
  button.disabled=true;status.textContent="Loading club statistics…";
  const missing=teams.filter(t=>!cache.has(t)), failed=[];
  async function worker() {
    while(missing.length) {
      const team=missing.shift();
      try {
        const res=await fetch("/api/offseason-data?arrivals="+team,{signal:AbortSignal.timeout(15000)});
        if(!res.ok) throw Error("Club request failed");
        const data=await res.json();
        if(data.team!==team||!Array.isArray(data.players)) throw Error("Invalid club response");
        cache.set(team,data.players);
      } catch { failed.push(team); }
    }
  }
  await Promise.all([worker(),worker(),worker()]);
  loaded=true;draw();
  const n=[...cache.values()].flat().length;
  status.textContent=failed.length ?
    "Partial coverage: "+n+" players loaded. Missing clubs: "+failed.sort().join(", ")+". Retry to fill the gaps." :
    n+" tracked skaters with a recorded appearance.";
  button.textContent=failed.length?"Retry missing clubs":"Refresh chart";
  button.disabled=false;
}
button.onclick=()=>{if(loaded&&cache.size===teams.length)cache.clear(); load()};
select.onchange=()=>{if(loaded)draw()};
