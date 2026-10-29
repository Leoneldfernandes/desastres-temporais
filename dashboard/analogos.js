(async () => {
  const root = document.getElementById('rev18-analogos');
  let raw;
  try {
    const response = await fetch('analogos.json?v=3');
    if (!response.ok) throw new Error('Falha ao carregar os dados');
    raw = await response.json();
  } catch (error) {
    root.textContent = 'Não foi possível carregar os dados do painel.';
    return;
  }
  const cities = raw.cities.map(([id,name,sovi,cat,icm]) => ({id,name,sovi,cat,icm}));
  const cityById = new Map(cities.map(c => [c.id,c]));
  const events = raw.events.map(([id,date,r1,r6,r3,damage,tip]) => ({id,date,r1,r6,r3,damage,tip}));
  const eventsByCity = new Map(cities.map(c => [c.id,[]]));
  events.forEach(event => eventsByCity.get(event.id).push(event));
  const labels = {1:'Muito baixa',2:'Baixa',3:'Média',4:'Alta',5:'Muito alta'};
  const soviCategory = value => value < -1.5 ? 1 : value < -0.5 ? 2 : value < 0.5 ? 3 : value < 1.5 ? 4 : 5;
  const legacySovi = {1:-2,2:-1,3:0,4:1,5:1.7};
  const el = id => root.querySelector('#' + id);
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem('desastres-temporais-analogos') || '{}'); }
  catch (_) { saved = {}; }
  if (!saved || typeof saved !== 'object') saved = {};
  const savedSovi = Number.isFinite(Number(saved.soviValue)) && saved.soviValue !== undefined
    ? Number(saved.soviValue) : legacySovi[Number(saved.sovi)] ?? 0;
  let state = {
    mode: ['registro','presenca','magnitude'].includes(saved.mode) ? saved.mode : 'registro',
    axis: ['rain','sovi','icm'].includes(saved.axis) ? saved.axis : 'rain',
    rain: Number.isFinite(Number(saved.rain)) ? Number(saved.rain) : 60,
    soviValue: Math.max(-3.5,Math.min(1.9,savedSovi)),
    icm: Number.isFinite(Number(saved.icm)) ? Math.min(20,Math.max(7,Number(saved.icm))) : 14
  };
  const fmt = (x,d=0) => Number(x).toLocaleString('pt-BR',{maximumFractionDigits:d,minimumFractionDigits:d});
  const median = a => { if(!a.length) return null; const b=[...a].sort((x,y)=>x-y), k=b.length>>1; return b.length%2 ? b[k] : (b[k-1]+b[k])/2; };
  const config = {
    registro: {window:'1 dia',max:200,field:'r1',edges:[0,10,25,50,75,100,150,200,Infinity],n:'dias',y:'Dias com registro / 1.000 dias'},
    presenca: {window:'6 dias',max:400,field:'r6',edges:[0,30,60,90,120,160,220,300,400,Infinity],n:'protocolos',y:'Protocolos com dano (%)'},
    magnitude: {window:'3 dias',max:350,field:'r3',edges:[0,25,50,75,100,140,190,260,350,Infinity],n:'protocolos positivos',y:'Mediana dos danos humanos'}
  };
  const trend=(()=>{
    const n=cities.length, mx=cities.reduce((sum,c)=>sum+c.sovi,0)/n, my=cities.reduce((sum,c)=>sum+c.icm,0)/n;
    const sxx=cities.reduce((sum,c)=>sum+(c.sovi-mx)**2,0);
    const syy=cities.reduce((sum,c)=>sum+(c.icm-my)**2,0);
    const sxy=cities.reduce((sum,c)=>sum+(c.sovi-mx)*(c.icm-my),0);
    const slope=sxy/sxx, intercept=my-slope*mx, r=sxy/Math.sqrt(sxx*syy);
    return {n,slope,intercept,r,r2:r*r};
  })();
  let selectedScatterCity = null;
  let scatterPointer = null;
  let moveScatterPointer = () => {};
  let scatterCache = {key:null,points:[]};
  function saveState(){ try { localStorage.setItem('desastres-temporais-analogos', JSON.stringify(state)); } catch (_) {} }
  function getPool(){
    const cat=soviCategory(state.soviValue), inCat=cities.filter(c=>c.cat===cat);
    const ranked=[...cities].sort((a,b)=>{
      const score=c=>Math.abs(c.sovi-state.soviValue)+Math.abs(c.icm-state.icm)/3;
      return score(a)-score(b) || a.name.localeCompare(b.name,'pt-BR');
    });
    if(state.axis==='rain')return {pool:ranked.slice(0,8),chartPool:ranked.slice(0,8),exact:inCat.length};
    if(state.axis==='sovi'){
      const chartPool=cities.filter(c=>Math.abs(c.icm-state.icm)<=2);
      return {pool:chartPool.filter(c=>c.cat===cat).sort((a,b)=>Math.abs(a.sovi-state.soviValue)-Math.abs(b.sovi-state.soviValue)),chartPool,exact:inCat.length};
    }
    const chartPool=cities.filter(c=>Math.abs(c.sovi-state.soviValue)<=0.5);
    const band=icmBands.find(b=>state.icm>=b.lo&&state.icm<=b.hi);
    return {pool:chartPool.filter(c=>c.icm>=band.lo&&c.icm<=band.hi).sort((a,b)=>Math.abs(a.icm-state.icm)-Math.abs(b.icm-state.icm)),chartPool,exact:inCat.length};
  }
  const icmBands=[{lo:7,hi:9},{lo:10,hi:12},{lo:13,hi:15},{lo:16,hi:18},{lo:19,hi:20}];
  const soviBins=[
    {cat:1,label:'<−1,5',fullLabel:'SoVI < −1,5 (muito baixa)'},
    {cat:2,label:'−1,0',fullLabel:'−1,5 ≤ SoVI < −0,5 (baixa)'},
    {cat:3,label:'0',fullLabel:'−0,5 ≤ SoVI < 0,5 (média)'},
    {cat:4,label:'1,0',fullLabel:'0,5 ≤ SoVI < 1,5 (alta)'},
    {cat:5,label:'≥1,5',fullLabel:'SoVI ≥ 1,5 (muito alta)'}
  ];
  function tolerance(){ return Math.max(10,Math.round(state.rain*.12/5)*5); }
  function selectedData(pool){
    const set=new Set(pool.map(c=>c.id));
    const conf=config[state.mode], tol=tolerance();
    const near=events.filter(e=>set.has(e.id)&&Math.abs(e[conf.field]-state.rain)<=tol);
    let days=0,recordDays=0;
    if(state.mode==='registro') for(const c of pool) for(const [bin,n,r] of (raw.hist[c.id]||[]))
      if(bin>=state.rain-tol && bin<=state.rain+tol){days+=n;recordDays+=r;}
    const positive=near.filter(e=>e.damage>0);
    const n=state.mode==='registro'?days:state.mode==='presenca'?near.length:positive.length;
    return {near,positive,days,recordDays,n,tol,set};
  }
  function aggregateGroup(pool,lo,hi){
    const conf=config[state.mode], set=new Set(pool.map(c=>c.id));
    const useSelectedRain=state.axis!=='rain', tol=tolerance();
    let n=0,k=0,damages=[];
    if(state.mode==='registro'){
      for(const c of pool)for(const [bin,d,r] of (raw.hist[c.id]||[]))
        if(useSelectedRain?Math.abs(bin-state.rain)<=tol:bin>=lo&&bin<hi){n+=d;k+=r;}
    }else{
      for(const e of events)if(set.has(e.id)&&(useSelectedRain?Math.abs(e[conf.field]-state.rain)<=tol:e[conf.field]>=lo&&e[conf.field]<hi)){
        if(state.mode==='presenca'){n++;if(e.damage>0)k++;}
        else if(e.damage>0){n++;damages.push(e.damage);}
      }
    }
    const value=n?(state.mode==='registro'?1000*k/n:state.mode==='presenca'?100*k/n:median(damages)):null;
    return {n,k,value};
  }
  function chartGroups(chartPool,width){
    if(state.axis==='rain'){
      const edges=width<430?config[state.mode].edges.filter((_,i)=>i===0||i===config[state.mode].edges.length-1||i%2===0):config[state.mode].edges;
      return edges.slice(0,-1).map((lo,i)=>{
        const hi=edges[i+1],label=hi===Infinity?`≥${lo}`:`${lo}–${hi}`;
        return {label,selected:state.rain>=lo&&state.rain<hi,...aggregateGroup(chartPool,lo,hi)};
      });
    }
    if(state.axis==='sovi')return soviBins.map(b=>({
      label:b.label,fullLabel:b.fullLabel,
      selected:soviCategory(state.soviValue)===b.cat,
      ...aggregateGroup(chartPool.filter(c=>c.cat===b.cat))
    }));
    return icmBands.map(b=>({
      label:`${b.lo}–${b.hi}`,selected:state.icm>=b.lo&&state.icm<=b.hi,
      ...aggregateGroup(chartPool.filter(c=>c.icm>=b.lo&&c.icm<=b.hi))
    }));
  }
  const svgNS='http://www.w3.org/2000/svg';
  function node(tag,attrs={},text){const n=document.createElementNS(svgNS,tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,v);if(text!==undefined)n.textContent=text;return n;}
  function chart(pool){
    const conf=config[state.mode], svg=el('rev18-chart'), width=Math.max(320,Math.floor(svg.clientWidth||root.clientWidth||736));
    const height=270,left=67,right=15,top=36,bottom=64,pw=width-left-right,ph=height-top-bottom;
    const bins=chartGroups(pool,width), maxv=Math.max(1,...bins.map(b=>b.value||0))*1.15;
    svg.setAttribute('viewBox',`0 0 ${width} ${height}`);svg.replaceChildren();
    const axisTitle=state.axis==='rain'?`Precipitação acumulada (${conf.window}, mm)`:state.axis==='sovi'?'SoVI (valor numérico agrupado)':'ICM (faixas de pontuação)';
    svg.appendChild(node('title',{},`Resultado histórico por ${axisTitle}`));
    svg.appendChild(node('desc',{},`${conf.y}. As outras duas variáveis definem a comparação. A faixa selecionada recebe destaque.`));
    svg.appendChild(node('rect',{x:left,y:top,width:pw,height:ph,class:'chart-frame','data-chart-frame':''}));
    for(let j=0;j<=3;j++){
      const y=top+ph-j*ph/3,v=maxv*j/3;
      svg.appendChild(node('line',{x1:left,y1:y,x2:left+pw,y2:y,class:'grid'}));
      svg.appendChild(node('text',{x:left-6,y:y+4,'text-anchor':'end',class:'axis-label'},fmt(v,v<10?1:0)));
    }
    svg.appendChild(node('text',{x:left,y:20,class:'axis-title','data-axis':'y'},conf.y));
    svg.appendChild(node('text',{x:left+pw/2,y:height-8,'text-anchor':'middle',class:'axis-title','data-axis':'x'},axisTitle));
    const slot=pw/bins.length;
    bins.forEach((b,i)=>{
      const x=left+i*slot+3,w=Math.max(4,slot-6),h=b.value===null?0:ph*b.value/maxv,y=top+ph-h;
      const cls='bar'+(b.selected?' selected':'')+(b.n<(state.mode==='magnitude'?5:20)?' sparse':'');
      const unit=state.axis==='rain'?' mm':'';
      const label=b.fullLabel||b.label+unit;
      const rect=node('rect',{x,y,width:w,height:h,class:cls,'data-tooltip':`${label}: ${b.value===null?'sem observações':fmt(b.value,b.value<10?1:0)+'; n='+fmt(b.n)}`,'aria-label':`${label}; ${b.n} ${conf.n}`});
      svg.appendChild(rect);
      svg.appendChild(node('text',{x:x+w/2,y:top+ph+17,'text-anchor':'middle',class:'axis-label'},b.label));
      if(width>=550||b.selected)svg.appendChild(node('text',{x:x+w/2,y:top+ph+34,'text-anchor':'middle',class:'axis-label'},`n=${fmt(b.n)}`));
      if(b.selected){
        svg.appendChild(node('line',{x1:x+w/2,y1:top+2,x2:x+w/2,y2:top+ph,stroke:'var(--viz-series-2)','stroke-width':2,'stroke-dasharray':'4 4'}));
        if(width>=550)svg.appendChild(node('text',{x:x+w/2,y:top-3,'text-anchor':'middle',class:'selected-label'},'Escolhida'));
      }
    });
  }
  function scatterPoints(){
    const key=`${state.mode}:${state.rain}`;
    if(scatterCache.key===key)return scatterCache.points;
    const conf=config[state.mode],tol=tolerance();
    const points=cities.map(city=>{
      if(state.mode==='registro'){
        let n=0,k=0;
        for(const [bin,days,records] of raw.hist[city.id]||[])
          if(Math.abs(bin-state.rain)<=tol){n+=days;k+=records;}
        return {...city,n,k,value:n?1000*k/n:null};
      }
      const near=(eventsByCity.get(city.id)||[]).filter(event=>Math.abs(event[conf.field]-state.rain)<=tol);
      if(state.mode==='presenca'){
        const k=near.filter(event=>event.damage>0).length;
        return {...city,n:near.length,k,value:near.length?100*k/near.length:null};
      }
      const positive=near.filter(event=>event.damage>0).map(event=>event.damage);
      return {...city,n:positive.length,k:positive.length,value:median(positive)};
    });
    scatterCache={key,points};
    return points;
  }
  function scatterDetail(points,nearest,tol){
    const chosen=points.find(point=>point.id===selectedScatterCity);
    const unit=config[state.mode].y;
    const minimum=state.mode==='registro'?30:10;
    const supported=points.filter(point=>point.n>=minimum).length;
    el('rev18-scatter-detail').textContent=chosen
      ? `${chosen.name} · SoVI ${fmt(chosen.sovi,2)} · ICM ${chosen.icm} · ${chosen.value===null?'sem observações comparáveis':fmt(chosen.value,1)+' '+unit} · n=${fmt(chosen.n)}${chosen.n<minimum?' (poucas observações)':''}.`
      : `Perfis próximos: ${nearest.map(point=>point.name).join(', ')}. Chuva ${fmt(state.rain)} ± ${fmt(tol)} mm; ${supported} de ${points.length} municípios com ao menos ${minimum} ${state.mode==='registro'?'dias':'protocolos'} comparáveis.`;
    el('rev18-scatter-value-head').textContent=unit;
    el('rev18-scatter-n-head').textContent=state.mode==='registro'?'Base (dias)':state.mode==='presenca'?'Base (protocolos)':'Base (protocolos com dano)';
    const tbody=el('rev18-scatter-rows');tbody.replaceChildren();
    const rows=chosen&&!nearest.some(point=>point.id===chosen.id)?[chosen,...nearest]:nearest;
    for(const point of rows){
      const tr=document.createElement('tr'),isChosen=point.id===selectedScatterCity;
      if(isChosen)tr.className='is-selected';
      cell(tr,isChosen?'Consultado': 'Perfil próximo');
      cell(tr,point.name);
      cell(tr,fmt(point.sovi,2));
      cell(tr,fmt(point.icm));
      cell(tr,point.value===null?'—':fmt(point.value,1)+(state.mode==='presenca'?'%':''));
      cell(tr,fmt(point.n)+(point.n<minimum?' · poucos dados':''));
      tbody.appendChild(tr);
    }
  }
  function startScatterDrag(event){
    if(event.button!==undefined&&event.button!==0)return;
    event.preventDefault();event.stopPropagation();
    const svg=el('rev18-scatter');
    scatterPointer=event.pointerId;
    try{svg.setPointerCapture(event.pointerId);}catch(_){}
    moveScatterPointer(event);
  }
  function renderScatter(){
    const points=scatterPoints(),conf=config[state.mode],tol=tolerance();
    el('rev18-scatter-mode').value=state.mode;
    const rainControl=el('rev18-scatter-rain');rainControl.max=conf.max;rainControl.value=state.rain;
    el('rev18-scatter-rain-value').textContent=`${fmt(state.rain)} mm em ${conf.window}`;
    const soviControl=el('rev18-scatter-sovi');soviControl.value=state.soviValue;
    soviControl.setAttribute('aria-valuetext',`${fmt(state.soviValue,1)}; vulnerabilidade ${labels[soviCategory(state.soviValue)].toLowerCase()}`);
    el('rev18-scatter-sovi-value').textContent=`${fmt(state.soviValue,1)} · ${labels[soviCategory(state.soviValue)].toLowerCase()}`;
    el('rev18-scatter-icm').value=state.icm;
    el('rev18-scatter-icm-value').textContent=fmt(state.icm);
    const ranked=[...points].sort((a,b)=>{
      const score=point=>Math.abs(point.sovi-state.soviValue)+Math.abs(point.icm-state.icm)/3;
      return score(a)-score(b)||a.name.localeCompare(b.name,'pt-BR');
    });
    const nearest=ranked.slice(0,3),nearIds=new Set(nearest.map(point=>point.id));
    const values=points.map(point=>point.value).filter(value=>value!==null).sort((a,b)=>a-b);
    const ceiling=values.length?values[Math.floor(.9*(values.length-1))]||1:1;
    const minimum=state.mode==='registro'?30:10;
    el('rev18-scatter-weak').textContent=`Poucos dados (<${minimum} ${state.mode==='registro'?'dias':'protocolos'})`;
    el('rev18-scatter-scale').textContent=`Cor: 0–${fmt(ceiling,1)} ${conf.y}; acima disso, intensidade máxima. Valores observados, não previsões.`;
    const svg=el('rev18-scatter'),width=Math.max(320,Math.floor(svg.clientWidth||root.clientWidth||736));
    const height=360,margin={left:67,right:16,top:18,bottom:56};
    const plotW=width-margin.left-margin.right,plotH=height-margin.top-margin.bottom;
    svg.setAttribute('viewBox',`0 0 ${width} ${height}`);
    svg.setAttribute('aria-label',`${conf.y}; chuva de ${fmt(state.rain)} ± ${fmt(tol)} mm; ${points.length} municípios`);
    svg.replaceChildren();
    svg.appendChild(node('title',{},'Municípios por SoVI e ICM'));
    svg.appendChild(node('desc',{},'A intensidade da cor representa o resultado observado. A reta fixa representa o ajuste linear entre SoVI e ICM, não uma relação com registros ou danos. Círculos tracejados têm poucos dados.'));
    const lowX=Math.min(...points.map(point=>point.sovi))-.15;
    const highX=Math.max(...points.map(point=>point.sovi))+.15;
    const x=value=>margin.left+8+(value-lowX)/(highX-lowX)*(plotW-16);
    const y=value=>height-margin.bottom-8-(value-6)/15*(plotH-16);
    moveScatterPointer=event=>{
      const bounds=svg.getBoundingClientRect();
      if(!bounds.width||!bounds.height)return;
      const px=(event.clientX-bounds.left)*width/bounds.width;
      const py=(event.clientY-bounds.top)*height/bounds.height;
      const soviValue=Math.max(-3.5,Math.min(1.9,Math.round((lowX+(px-margin.left-8)/(plotW-16)*(highX-lowX))*10)/10));
      const icm=Math.max(7,Math.min(20,Math.round(6+(height-margin.bottom-8-py)/(plotH-16)*15)));
      if(soviValue===state.soviValue&&icm===state.icm)return;
      state.soviValue=soviValue;state.icm=icm;selectedScatterCity=null;
      update();
    };
    const frame=node('rect',{x:margin.left,y:margin.top,width:plotW,height:plotH,fill:'transparent',stroke:'var(--border)','data-chart-frame':'',class:'scatter-drag-target'});
    frame.addEventListener('pointerdown',startScatterDrag);svg.appendChild(frame);
    const xTicks=width<450?[-3,-1,1]:[-3,-2,-1,0,1,2];
    for(const tick of xTicks){
      const tx=x(tick);if(tx<margin.left||tx>width-margin.right)continue;
      svg.appendChild(node('line',{x1:tx,y1:margin.top,x2:tx,y2:height-margin.bottom,stroke:'var(--border)',opacity:.55}));
      svg.appendChild(node('text',{x:tx,y:height-margin.bottom+18,'text-anchor':'middle',class:'axis-label'},fmt(tick,1)));
    }
    for(const tick of [7,10,13,16,19]){
      const ty=y(tick);
      svg.appendChild(node('line',{x1:margin.left,y1:ty,x2:width-margin.right,y2:ty,stroke:'var(--border)',opacity:.55}));
      svg.appendChild(node('text',{x:margin.left-8,y:ty+4,'text-anchor':'end',class:'axis-label'},fmt(tick)));
    }
    svg.appendChild(node('text',{x:margin.left+plotW/2,y:height-8,'text-anchor':'middle',class:'axis-title','data-axis':'x'},'SoVI (escore numérico)'));
    svg.appendChild(node('text',{transform:`translate(16,${margin.top+plotH/2}) rotate(-90)`,'text-anchor':'middle',class:'axis-title','data-axis':'y'},'ICM (pontos)'));
    const minObserved=Math.min(...cities.map(city=>city.sovi));
    const maxObserved=Math.max(...cities.map(city=>city.sovi));
    const lineStart=Math.max(minObserved,(7-trend.intercept)/trend.slope);
    const lineEnd=Math.min(maxObserved,(20-trend.intercept)/trend.slope);
    svg.appendChild(node('line',{
      x1:x(lineStart),y1:y(trend.intercept+trend.slope*lineStart),
      x2:x(lineEnd),y2:y(trend.intercept+trend.slope*lineEnd),
      class:'scatter-trend-line','pointer-events':'none',
      'aria-label':'Ajuste linear fixo entre SoVI e ICM'
    }));
    for(const point of points){
      const weak=point.n<minimum;
      const label=`${point.name} · SoVI ${fmt(point.sovi,2)} · ICM ${point.icm} · ${point.value===null?'sem observações comparáveis':fmt(point.value,1)+' '+conf.y} · n=${fmt(point.n)}`;
      const dot=node('circle',{
        cx:x(point.sovi),cy:y(point.icm),r:nearIds.has(point.id)?6:4.5,
        fill:point.value===null?'var(--muted-foreground)':'var(--viz-series-1)',
        'fill-opacity':point.value===null ? .25 : Math.max(.25,Math.min(1,.2+.8*point.value/ceiling))*(weak ? .55 : 1),
        stroke:nearIds.has(point.id)?'var(--viz-series-2)':weak?'var(--muted-foreground)':'none',
        'stroke-width':nearIds.has(point.id)?2:1,'stroke-dasharray':weak?'2 2':'',
        'aria-label':label,class:'scatter-city'
      });
      dot.appendChild(node('title',{},label));
      dot.addEventListener('click',()=>{selectedScatterCity=point.id;scatterDetail(points,nearest,tol);});
      svg.appendChild(dot);
    }
    svg.appendChild(node('circle',{cx:x(state.soviValue),cy:y(state.icm),r:10,fill:'var(--viz-series-2)',stroke:'var(--foreground)','stroke-width':1.5,'pointer-events':'none'}));
    const handle=node('circle',{cx:x(state.soviValue),cy:y(state.icm),r:22,fill:'transparent',class:'scatter-drag-target','aria-label':`Perfil escolhido: SoVI ${fmt(state.soviValue,1)}, ICM ${state.icm}. Arraste para alterar.`});
    handle.appendChild(node('title',{},'Arraste para mudar SoVI e ICM'));
    handle.addEventListener('pointerdown',startScatterDrag);svg.appendChild(handle);
    el('rev18-scatter-trend-stats').textContent=`ICM = ${fmt(trend.intercept,2)} + ${fmt(trend.slope,2)} × SoVI · r = ${fmt(trend.r,3)} · R² = ${fmt(trend.r2,3)} · p nominal < 0,001 · n = ${trend.n}`;
    scatterDetail(points,nearest,tol);
  }
  function cell(tr,text){const td=document.createElement('td');td.textContent=text;tr.appendChild(td);}
  function update(){
    const conf=config[state.mode];state.rain=Math.max(0,Math.min(conf.max,state.rain));
    const rain=el('rev18-rain');rain.max=conf.max;rain.value=state.rain;
    el('rev18-rain-value').textContent=`${fmt(state.rain)} mm em ${conf.window}`;
    el('rev18-icm-value').textContent=fmt(state.icm);
    const soviCat=soviCategory(state.soviValue);
    const soviControl=el('rev18-sovi'), soviLevel=el('rev18-sovi-level');
    soviControl.value=String(state.soviValue);
    soviControl.setAttribute('aria-valuetext',`${fmt(state.soviValue,1)}; vulnerabilidade ${labels[soviCat].toLowerCase()}`);
    el('rev18-sovi-value').textContent=fmt(state.soviValue,1);
    soviLevel.textContent=labels[soviCat];soviLevel.dataset.cat=String(soviCat);
    el('rev18-icm').value=String(state.icm);el('rev18-axis').value=state.axis;
    root.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===state.mode)));
    const {pool,chartPool,exact}=getPool(), data=selectedData(pool), ids=new Set(data.near.map(e=>e.id));
    const nCities=state.mode==='registro'?pool.filter(c=>(raw.hist[c.id]||[]).some(([bin,n])=>n>0&&bin>=state.rain-data.tol&&bin<=state.rain+data.tol)).length:state.mode==='magnitude'?new Set(data.positive.map(e=>e.id)).size:ids.size;
    const low=data.n<(state.mode==='registro'?30:10);
    const axisSupport=state.axis==='rain'?`${pool.length} perfis municipais mais próximos de SoVI ${fmt(state.soviValue,1)} e ICM ${state.icm}; ${exact} municípios em toda a base na classe ${labels[soviCat].toLowerCase()}. Barras: faixas de chuva; resumo: ${fmt(state.rain)} ± ${fmt(data.tol)} mm.`:state.axis==='sovi'?`Eixo SoVI: ${chartPool.length} municípios com ICM ${state.icm} ± 2; ${pool.length} na classe ${labels[soviCat].toLowerCase()}. As barras agrupam intervalos numéricos do SoVI; dentro de cada intervalo a barra não muda. Chuva: ${fmt(state.rain)} ± ${fmt(data.tol)} mm.`:`Eixo ICM: ${chartPool.length} municípios com SoVI entre ${fmt(state.soviValue-0.5,1)} e ${fmt(state.soviValue+0.5,1)}; ${pool.length} na faixa ICM escolhida. Chuva: ${fmt(state.rain)} ± ${fmt(data.tol)} mm.`;
    el('rev18-support').textContent=axisSupport+(low?' Poucas observações nesta combinação.':'');
    const outcome=state.mode==='registro'?'Dias com registro':state.mode==='presenca'?'Protocolos com dano':'Magnitude do dano positivo';
    const predictor=state.axis==='rain'?'chuva':state.axis==='sovi'?'SoVI':'ICM';
    el('rev18-chart-title').textContent=`${outcome} conforme ${predictor}`;
    chart(chartPool);
    renderScatter();
    let aLabel,aValue,bLabel,bValue,cLabel,cValue;
    if(state.mode==='registro'){
      aLabel='Dias com registro / 1.000 dias';aValue=data.days?fmt(1000*data.recordDays/data.days,1):'—';
      bLabel='Dias comparáveis';bValue=fmt(data.days);
      cLabel='Dias com registro';cValue=fmt(data.recordDays);
    }else if(state.mode==='presenca'){
      aLabel='Protocolos com dano';aValue=data.near.length?fmt(100*data.positive.length/data.near.length,1)+'%':'—';
      bLabel='Protocolos comparáveis';bValue=fmt(data.near.length);
      cLabel='Com dano humano';cValue=fmt(data.positive.length);
    }else{
      aLabel='Mediana dos danos positivos';aValue=data.positive.length?fmt(median(data.positive.map(e=>e.damage))):'—';
      bLabel='Protocolos comparáveis';bValue=fmt(data.positive.length);
      cLabel='Municípios representados';cValue=fmt(nCities);
    }
    [['a',aLabel,aValue],['b',bLabel,bValue],['c',cLabel,cValue]].forEach(([key,label,value])=>{el(`rev18-stat-${key}-label`).textContent=label;el(`rev18-stat-${key}`).textContent=value;});
    el('rev18-city-count-head').textContent=state.mode==='registro'?'Dias / dias com registro':state.mode==='presenca'?'Protocolos / com dano':'Danos positivos';
    const tbody=el('rev18-city-rows');tbody.replaceChildren();
    pool.slice(0,5).forEach(city=>{
      const tr=document.createElement('tr'),cityEvents=data.near.filter(e=>e.id===city.id),pos=cityEvents.filter(e=>e.damage>0);
      let observation;
      if(state.mode==='registro'){
        let nd=0,nr=0;for(const [bin,d,r] of raw.hist[city.id]||[])if(bin>=state.rain-data.tol&&bin<=state.rain+data.tol){nd+=d;nr+=r;}
        observation=`${fmt(nd)} / ${fmt(nr)}`;
      }else if(state.mode==='presenca')observation=`${fmt(cityEvents.length)} / ${fmt(pos.length)}`;
      else observation=fmt(pos.length);
      cell(tr,city.name);cell(tr,`${labels[city.cat]} (${fmt(city.sovi,2)})`);cell(tr,fmt(city.icm));cell(tr,observation);cell(tr,fmt(pos.reduce((s,e)=>s+e.damage,0)));
      tbody.appendChild(tr);
    });
    const examples=el('rev18-examples');
    const order=new Map(pool.map((c,i)=>[c.id,i]));
    const exemplars=(state.mode==='magnitude'?data.positive:data.near).slice().sort((a,b)=>
      Math.abs(a[conf.field]-state.rain)-Math.abs(b[conf.field]-state.rain) || order.get(a.id)-order.get(b.id)).slice(0,3);
    examples.textContent=exemplars.length?'Protocolos históricos próximos: '+exemplars.map(e=>`${cityById.get(e.id).name} (${e.date}, ${fmt(e[conf.field],1)} mm, ${fmt(e.damage)} danos humanos)`).join(' · '):'Não há protocolos históricos nessa faixa para os perfis selecionados.';
  }
  root.querySelectorAll('[data-mode]').forEach(b=>b.addEventListener('click',()=>{state.mode=b.dataset.mode;state.rain=Math.min(state.rain,config[state.mode].max);update();saveState();}));
  el('rev18-axis').addEventListener('change',e=>{state.axis=e.target.value;update();saveState();});
  el('rev18-rain').addEventListener('input',e=>{state.rain=Number(e.target.value);update();});
  el('rev18-rain').addEventListener('change',saveState);
  el('rev18-sovi').addEventListener('input',e=>{state.soviValue=Number(e.target.value);selectedScatterCity=null;update();});
  el('rev18-sovi').addEventListener('change',saveState);
  el('rev18-icm').addEventListener('input',e=>{state.icm=Number(e.target.value);selectedScatterCity=null;update();});
  el('rev18-icm').addEventListener('change',saveState);
  el('rev18-scatter-mode').addEventListener('change',event=>{state.mode=event.target.value;state.rain=Math.min(state.rain,config[state.mode].max);selectedScatterCity=null;update();saveState();});
  el('rev18-scatter-rain').addEventListener('input',event=>{state.rain=Number(event.target.value);selectedScatterCity=null;update();});
  el('rev18-scatter-rain').addEventListener('change',saveState);
  el('rev18-scatter-sovi').addEventListener('input',event=>{state.soviValue=Number(event.target.value);selectedScatterCity=null;update();});
  el('rev18-scatter-sovi').addEventListener('change',saveState);
  el('rev18-scatter-icm').addEventListener('input',event=>{state.icm=Number(event.target.value);selectedScatterCity=null;update();});
  el('rev18-scatter-icm').addEventListener('change',saveState);
  const scatter=el('rev18-scatter');
  scatter.addEventListener('pointermove',event=>{
    if(scatterPointer===event.pointerId)moveScatterPointer(event);
  });
  const finishScatterDrag=event=>{
    if(scatterPointer!==event.pointerId)return;
    moveScatterPointer(event);scatterPointer=null;
    try{scatter.releasePointerCapture(event.pointerId);}catch(_){}
    saveState();
  };
  scatter.addEventListener('pointerup',finishScatterDrag);
  scatter.addEventListener('pointercancel',finishScatterDrag);
  new ResizeObserver(()=>chart(getPool().chartPool)).observe(el('rev18-chart'));
  let scatterWidth=0;
  new ResizeObserver(()=>{
    const width=Math.floor(scatter.clientWidth);
    if(width&&width!==scatterWidth){scatterWidth=width;renderScatter();}
  }).observe(scatter);
  update();
  const reportSize = () => {
    window.parent.postMessage({
      source: 'desastres-temporais-analogos',
      height: Math.ceil(document.documentElement.scrollHeight)
    }, window.location.origin);
  };
  new ResizeObserver(reportSize).observe(root);
  reportSize();
})();
