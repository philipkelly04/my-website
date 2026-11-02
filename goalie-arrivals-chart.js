const root=document.querySelector("#goalie-arrivals");
if(root) setup(root);
function setup(root){
  root.innerHTML='<h2>New goalie arrivals: workload vs save percentage</h2><p>Tracked offseason additions · 2026–27 regular season · At least one shot faced for the new club. Higher means a larger share saved; farther right means more shots faced.</p><button type="button">Load goalie chart</button><p role="status"></p><div class="goalie-plot"></div><p class="goalie-detail" aria-live="polite"></p>';
  const button=root.querySelector("button"),status=root.querySelector('[role=status]'),plot=root.querySelector(".goalie-plot"),detail=root.querySelector(".goalie-detail");
  const pct=n=>n.toFixed(3).replace(/^0\./,".");
  function draw(rows){
    plot.replaceChildren();detail.textContent="";
    if(!rows.length)return;
    function tag(type,attrs,parent,value){
      const el=document.createElementNS("http://www.w3.org/2000/svg",type);
      for(const [key,v] of Object.entries(attrs))el.setAttribute(key,v);
      if(value!==undefined)el.textContent=value;
      parent.append(el);return el;
    }
    const svg=tag("svg",{viewBox:"0 0 570 320",role:"group","aria-label":"Goalie shots faced versus save percentage"},plot);
    svg.style.cssText="width:100%;max-width:820px;background:#15191f;border-radius:12px;display:block";
    const xmax=Math.max(50,Math.ceil(Math.max(...rows.map(p=>p.shots))/50)*50);
    const ymin=Math.max(0,Math.min(.85,Math.floor(Math.min(...rows.map(p=>p.sv))*20)/20));
    const x=v=>64+475*v/xmax,y=v=>265-226*(v-ymin)/(1-ymin);
    const text=(a,b,s)=>tag("text",{x:a,y:b,fill:"#f5f7fa","font-size":13,"text-anchor":"middle"},svg,s);
    text(74,21,"Save %");text(300,309,"Shots faced for new club");
    for(let i=0;i<=5;i++){
      const v=ymin+(1-ymin)*i/5;
      tag("line",{x1:x(0),x2:x(xmax),y1:y(v),y2:y(v),stroke:"#46505c"},svg);
      text(35,y(v)+4,pct(v));text(x(i*xmax/5),287,String(i*xmax/5));
    }
    const groups=new Map();
    for(const p of rows){const k=p.shots+":"+p.saves;if(!groups.has(k))groups.set(k,[]);groups.get(k).push(p);}
    const description=p=>p.name+" ("+p.team+") · "+p.gp+" GP · "+p.shots+" shots faced · "+p.saves+" saves · "+pct(p.sv)+" SV%";
    for(const list of groups.values()){
      const p=list[0],label=list.map(description).join(" | ");
      const g=tag("g",{transform:"translate("+x(p.shots)+" "+y(p.sv)+")",tabindex:0,role:"button","aria-label":label},svg);
      tag("title",{},g,label);
      tag("circle",{r:14,fill:"#263346",stroke:"#eac451"},g);
      tag("text",{y:4,"text-anchor":"middle",fill:"white","font-size":10},g,p.team);
      const image=tag("image",{x:-13,y:-13,width:26,height:26,href:"https://assets.nhle.com/logos/nhl/svg/"+p.team+"_dark.svg",style:"background:#263346"},g);
      image.onload=()=>{g.querySelector("text").setAttribute("visibility","hidden")};
      image.onerror=()=>image.remove();
      if(list.length>1)tag("text",{x:10,y:-9,fill:"white",stroke:"#15191f","paint-order":"stroke","font-size":12},g,String(list.length));
      for(const event of ["click","focus","pointerenter"])g.addEventListener(event,()=>{detail.textContent=label});
      g.addEventListener("keydown",e=>{if(["Enter"," "].includes(e.key)){e.preventDefault();detail.textContent=label}});
    }
    detail.textContent="Tap or focus a logo for goalie details.";
  }
  let loaded=false;
  button.onclick=async()=>{
    button.disabled=true;status.textContent="Loading goalie statistics…";
    try{
      const r=await fetch("/api/offseason-data?goalieArrivals=1",{signal:AbortSignal.timeout(15000)});
      if(!r.ok)throw Error();
      const data=await r.json();
      if(!Array.isArray(data.players)||!Array.isArray(data.missing))throw Error();
      draw(data.players);loaded=true;
      status.textContent=data.players.length+" plotted from "+data.trackedCount+" tracked arrivals."+
        (data.missing.length?" Partial coverage: unavailable clubs "+data.missing.join(", ")+".":"");
      button.textContent=data.missing.length?"Retry goalie chart":"Refresh goalie chart";
    }catch{status.textContent="Goalie stats unavailable."+(loaded?" Showing the previous chart.":"");button.textContent="Retry goalie chart";}
    finally{button.disabled=false}
  };
}
