(async () => {
  const root = document.getElementById('rev18-analogos');
  let raw;
  try {
    const response = await fetch('analogos.json');
    if (!response.ok) throw new Error('Falha ao carregar os dados');
    raw = await response.json();
  } catch (error) {
    root.textContent = 'Não foi possível carregar os dados do painel.';
    return;
  }
  const cities = raw.cities.map(([id,name,sovi,cat,icm]) => ({id,name,sovi,cat,icm}));
  const cityById = new Map(cities.map(c => [c.id,c]));
  const events = raw.events.map(([id,date,r1,r6,r3,damage,tip]) => ({id,date,r1,r6,r3,damage,tip}));
  const labels = {1:'Muito baixa',2:'Baixa',3:'Média',4:'Alta',5:'Muito alta'};
  const el = id => root.querySelector('#' + id);
  let saved = {};
  try { saved = JSON.parse(localStorage.getItem('desastres-temporais-analogos') || '{}'); }
  catch (_) { saved = {}; }
  if (!saved || typeof saved !== 'object') saved = {};
  let state = {
    mode: ['registro','presenca','magnitude'].includes(saved.mode) ? saved.mode : 'registro',
    axis: ['rain','sovi','icm'].includes(saved.axis) ? saved.axis : 'rain',
    rain: Number.isFinite(Number(saved.rain)) ? Number(saved.rain) : 60,
    sovi: [1,2,3,4,5].includes(Number(saved.sovi)) ? Number(saved.sovi) : 3,
    icm: Number.isFinite(Number(saved.icm)) ? Math.min(20,Math.max(7,Number(saved.icm))) : 14
  };
  const fmt = (x,d=0) => Number(x).toLocaleString('pt-BR',{maximumFractionDigits:d,minimumFractionDigits:d});
  const median = a => { if(!a.length) return null; const b=[...a].sort((x,y)=>x-y), k=b.length>>1; return b.length%2 ? b[k] : (b[k-1]+b[k])/2; };
  const config = {
    registro: {window:'1 dia',max:200,field:'r1',edges:[0,10,25,50,75,100,150,200,Infinity],n:'dias',y:'Dias com registro / 1.000 dias'},
    presenca: {window:'6 dias',max:400,field:'r6',edges:[0,30,60,90,120,160,220,300,400,Infinity],n:'protocolos',y:'Protocolos com dano (%)'},
    magnitude: {window:'3 dias',max:350,field:'r3',edges:[0,25,50,75,100,140,190,260,350,Infinity],n:'protocolos positivos',y:'Mediana dos danos humanos'}
  };
  function saveState(){ try { localStorage.setItem('desastres-temporais-analogos', JSON.stringify(state)); } catch (_) {} }
  function getPool(){
    const inCat=cities.filter(c=>c.cat===state.sovi);
    const target=median(inCat.map(c=>c.sovi));
    const ranked=[...cities].sort((a,b)=>{
      const score=c=>Math.abs(c.cat-state.sovi)*3+Math.abs(c.icm-state.icm)/3+Math.abs(c.sovi-target)/1.5;
      return score(a)-score(b) || a.name.localeCompare(b.name,'pt-BR');
    });
    if(state.axis==='rain')return {pool:ranked.slice(0,8),chartPool:ranked.slice(0,8),exact:inCat.length};
    if(state.axis==='sovi'){
      const chartPool=cities.filter(c=>Math.abs(c.icm-state.icm)<=2);
      return {pool:chartPool.filter(c=>c.cat===state.sovi).sort((a,b)=>Math.abs(a.icm-state.icm)-Math.abs(b.icm-state.icm)),chartPool,exact:inCat.length};
    }
    const chartPool=inCat;
    const band=icmBands.find(b=>state.icm>=b.lo&&state.icm<=b.hi);
    return {pool:chartPool.filter(c=>c.icm>=band.lo&&c.icm<=band.hi).sort((a,b)=>Math.abs(a.icm-state.icm)-Math.abs(b.icm-state.icm)),chartPool,exact:inCat.length};
  }
  const icmBands=[{lo:7,hi:9},{lo:10,hi:12},{lo:13,hi:15},{lo:16,hi:18},{lo:19,hi:20}];
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
    if(state.axis==='sovi')return [1,2,3,4,5].map(cat=>({
      label:width<500?({1:'M. baixa',2:'Baixa',3:'Média',4:'Alta',5:'M. alta'}[cat]):labels[cat],
      selected:state.sovi===cat,
      ...aggregateGroup(chartPool.filter(c=>c.cat===cat))
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
    const axisTitle=state.axis==='rain'?`Precipitação acumulada (${conf.window}, mm)`:state.axis==='sovi'?'Faixa de vulnerabilidade (SoVI)':'ICM (faixas de pontuação)';
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
      const rect=node('rect',{x,y,width:w,height:h,class:cls,'data-tooltip':`${b.label}${unit}: ${b.value===null?'sem observações':fmt(b.value,b.value<10?1:0)+'; n='+fmt(b.n)}`,'aria-label':`${b.label}${unit}; ${b.n} ${conf.n}`});
      svg.appendChild(rect);
      svg.appendChild(node('text',{x:x+w/2,y:top+ph+17,'text-anchor':'middle',class:'axis-label'},b.label));
      if(width>=550||b.selected)svg.appendChild(node('text',{x:x+w/2,y:top+ph+34,'text-anchor':'middle',class:'axis-label'},`n=${fmt(b.n)}`));
      if(b.selected){
        svg.appendChild(node('line',{x1:x+w/2,y1:top+2,x2:x+w/2,y2:top+ph,stroke:'var(--viz-series-2)','stroke-width':2,'stroke-dasharray':'4 4'}));
        if(width>=550)svg.appendChild(node('text',{x:x+w/2,y:top-3,'text-anchor':'middle',class:'selected-label'},'Escolhida'));
      }
    });
  }
  function cell(tr,text){const td=document.createElement('td');td.textContent=text;tr.appendChild(td);}
  function update(){
    const conf=config[state.mode];state.rain=Math.max(0,Math.min(conf.max,state.rain));
    const rain=el('rev18-rain');rain.max=conf.max;rain.value=state.rain;
    el('rev18-rain-value').textContent=`${fmt(state.rain)} mm em ${conf.window}`;
    el('rev18-icm-value').textContent=fmt(state.icm);
    el('rev18-sovi').value=String(state.sovi);el('rev18-icm').value=String(state.icm);el('rev18-axis').value=state.axis;
    root.querySelectorAll('[data-mode]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.mode===state.mode)));
    const {pool,chartPool,exact}=getPool(), data=selectedData(pool), ids=new Set(data.near.map(e=>e.id));
    const nCities=state.mode==='registro'?pool.filter(c=>(raw.hist[c.id]||[]).some(([bin,n])=>n>0&&bin>=state.rain-data.tol&&bin<=state.rain+data.tol)).length:state.mode==='magnitude'?new Set(data.positive.map(e=>e.id)).size:ids.size;
    const low=data.n<(state.mode==='registro'?30:10);
    const axisSupport=state.axis==='rain'?`${pool.length} perfis municipais mais próximos; ${exact} na faixa SoVI ${labels[state.sovi].toLowerCase()}. Barras: faixas de chuva; resumo: ${fmt(state.rain)} ± ${fmt(data.tol)} mm.`:state.axis==='sovi'?`Eixo SoVI: ${chartPool.length} municípios com ICM ${state.icm} ± 2; ${pool.length} na faixa escolhida. Chuva: ${fmt(state.rain)} ± ${fmt(data.tol)} mm.`:`Eixo ICM: ${chartPool.length} municípios com SoVI ${labels[state.sovi].toLowerCase()}; ${pool.length} na faixa ICM escolhida. Chuva: ${fmt(state.rain)} ± ${fmt(data.tol)} mm.`;
    el('rev18-support').textContent=axisSupport+(low?' Poucas observações nesta combinação.':'');
    const outcome=state.mode==='registro'?'Dias com registro':state.mode==='presenca'?'Protocolos com dano':'Magnitude do dano positivo';
    const predictor=state.axis==='rain'?'chuva':state.axis==='sovi'?'SoVI':'ICM';
    el('rev18-chart-title').textContent=`${outcome} conforme ${predictor}`;
    chart(chartPool);
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
  el('rev18-sovi').addEventListener('change',e=>{state.sovi=Number(e.target.value);update();saveState();});
  el('rev18-icm').addEventListener('input',e=>{state.icm=Number(e.target.value);update();});
  el('rev18-icm').addEventListener('change',saveState);
  new ResizeObserver(()=>chart(getPool().chartPool)).observe(el('rev18-chart'));
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
