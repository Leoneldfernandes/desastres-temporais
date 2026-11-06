(async () => {
let data;
try {
  const response = await fetch('simulador-rev20-data.json?v=1');
  if (!response.ok) throw new Error('Data request failed');
  data = await response.json();
} catch (_) {
  document.querySelector('main.wrap').textContent = 'Não foi possível carregar os dados do simulador.';
  return;
}
const $=id=>document.getElementById(id);const fmt=(x,d=0)=>Number(x).toLocaleString('pt-BR',{maximumFractionDigits:d,minimumFractionDigits:d});
const months=['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const city=$('city'), month=$('month');let sortMode='near';
for(const m of data.municipios){const o=document.createElement('option');o.value=m.id;o.textContent=m.nome+' ('+m.id+')';city.append(o)}
months.forEach((name,i)=>{const o=document.createElement('option');o.value=i+1;o.textContent=name;month.append(o)});
month.value='1';let defaultCity=data.municipios.find(x=>x.id==='4205407')||data.municipios[0];city.value=defaultCity.id;
const rainValues=[60,0,0,0,0,0];
const labels=['Hoje','Ontem','Há 2 dias','Há 3 dias','Há 4 dias','Há 5 dias'];
labels.forEach((label,i)=>{const row=document.createElement('div');row.className='rainrow';row.innerHTML=`<label for="rain${i}">${label}</label><input type="range" id="rain${i}" min="0" max="250" step="1" value="${rainValues[i]}"><input type="number" id="rainN${i}" min="0" max="500" step="1" value="${rainValues[i]}" aria-label="Chuva ${label} em milímetros">`;$('rainrows').append(row);const slider=$('rain'+i),num=$('rainN'+i);slider.addEventListener('input',()=>{num.value=slider.value;rainValues[i]=Number(slider.value);update()});num.addEventListener('change',()=>{const v=Math.max(0,Math.min(500,Number(num.value)||0));rainValues[i]=v;slider.value=Math.min(250,v);num.value=v;update()})});
function sigmoid(z){return z>=0?1/(1+Math.exp(-z)):Math.exp(z)/(1+Math.exp(z))}
function predict(stage,rainMm,mun,mon){const b=data.modelos[stage];let z=(b['(Intercept)']||0)+(b.sovi||0)*mun.sovi_z+(b.icm||0)*mun.icm_z+(b['mes'+mon]||0);z+=(stage==='contagem'?(b.log_chuva||0)*Math.log1p(rainMm/10):(b.chuva||0)*(rainMm/10));return stage==='contagem'?Math.exp(Math.min(z,30)):sigmoid(z)}
function sowiClass(x){if(x< -1.5)return ['Muito baixa','#2d8c90'];if(x<-.5)return ['Baixa','#63a3ab'];if(x<.5)return ['Média','#b9a65b'];if(x<1.5)return ['Alta','#cf854f'];return ['Muito alta','#a85366']}
function recentDate(s){const p=s.split('-');return p.length===3?`${p[2]}/${p[1]}/${p[0]}`:s}
function rainSums(){return [rainValues[0],rainValues.slice(0,3).reduce((a,b)=>a+b,0),rainValues.reduce((a,b)=>a+b,0)]}
function drawCurve(mun,mon){const svg=$('plot');const past=rainValues.slice();const lines=[['registro','#087d7a'],['presenca','#d9922b']];const W=620,H=245,L=45,R=14,T=22,B=31;let out=`<line x1="${L}" y1="${H-B}" x2="${W-R}" y2="${H-B}" stroke="#9fb5bd"/><line x1="${L}" y1="${T}" x2="${L}" y2="${H-B}" stroke="#9fb5bd"/>`;
  for(let v=0;v<=100;v+=25){const y=H-B-(v/100)*(H-T-B);out+=`<line x1="${L}" y1="${y}" x2="${W-R}" y2="${y}" stroke="#e3edef"/><text x="${L-7}" y="${y+4}" text-anchor="end" font-size="11" fill="#526879">${v}%</text>`}
  for(let v=0;v<=200;v+=50){const x=L+(v/200)*(W-L-R);out+=`<text x="${x}" y="${H-9}" text-anchor="middle" font-size="11" fill="#526879">${v}</text>`}
  for(const [stage,color] of lines){let points=[];for(let v=0;v<=200;v+=4){const s=stage==='registro'?v:v+past[1]+past[2]+past[3]+past[4]+past[5];const yy=predict(stage,s,mun,mon);const x=L+(v/200)*(W-L-R),y=H-B-yy*(H-T-B);points.push(`${x.toFixed(1)},${y.toFixed(1)}`)}out+=`<polyline points="${points.join(' ')}" fill="none" stroke="${color}" stroke-width="3" stroke-linejoin="round"/>`}
  const x=L+(Math.min(past[0],200)/200)*(W-L-R);out+=`<line x1="${x}" y1="${T}" x2="${x}" y2="${H-B}" stroke="#667d86" stroke-dasharray="4 4"/><text x="${W-R}" y="${T-5}" text-anchor="end" font-size="11" fill="#526879">Chuva de hoje (mm)</text>`;svg.innerHTML=out;
}
function update(){const mun=data.municipios.find(x=>x.id===city.value),mon=Number(month.value);const [r1,r3,r6]=rainSums();const pc=predict('registro',r1,mun,mon),pd=predict('presenca',r6,mun,mon),cnt=predict('contagem',r3,mun,mon);const [cl,col]=sowiClass(mun.sovi_score);
  $('citymeta').innerHTML=`<span class="pill">SoVI <strong>${fmt(mun.sovi_score,2)}</strong></span><span class="pill" style="border-color:${col};color:${col}"><strong>${cl}</strong></span><span class="pill">ICM <strong>${fmt(mun.icm_total,2)}</strong></span>`;
  $('rainsummary').innerHTML=`<div class="sumitem"><span>1 dia</span><strong>${fmt(r1,1)} mm</strong></div><div class="sumitem"><span>3 dias</span><strong>${fmt(r3,1)} mm</strong></div><div class="sumitem"><span>6 dias</span><strong>${fmt(r6,1)} mm</strong></div>`;
  $('p-reg').textContent=fmt(100*pc,1)+'%';$('p-dam').textContent=fmt(100*pd,1)+'%';$('n-dam').textContent=cnt>100000?'muito alto':fmt(cnt,1);$('joint').textContent=`Chance conjunta aproximada de registro e algum dano: ${fmt(100*pc*pd,2)}%.`;
  $('b-reg').style.width=100*pc+'%';$('b-dam').style.width=100*pd+'%';
  const beyond=[];if(r1>data.limites.registro)beyond.push(`1 dia (${fmt(r1,1)} > ${fmt(data.limites.registro,1)} mm)`);if(r6>data.limites.presenca)beyond.push(`6 dias (${fmt(r6,1)} > ${fmt(data.limites.presenca,1)} mm)`);if(r3>data.limites.contagem)beyond.push(`3 dias (${fmt(r3,1)} > ${fmt(data.limites.contagem,1)} mm)`);const warn=$('range-warning');warn.hidden=!beyond.length;if(beyond.length)warn.textContent='Fora da faixa máxima de chuva usada no treino: '+beyond.join('; ')+'. O modelo pode extrapolar muito; não interprete esses números como previsão confiável.';
  const bin=10*Math.floor(Math.min(r1,300)/10),rec=data.faixas.find(x=>x.id===mun.id&&x.faixa_inicio_mm===bin);$('local-context').innerHTML=rec?`<p class="muted">Nesse município, entre os dias observados com chuva de 1 dia entre <strong>${fmt(bin)} e ${bin===300?'mais de 300':fmt(bin+10)} mm</strong>, houve <strong>${fmt(rec.registro)} registros em ${fmt(rec.dia)} dias</strong>.</p>`:`<p class="empty">Não há dias observados nessa faixa de chuva para o município.</p>`;
  const matches=data.eventos.filter(x=>x.id===mun.id);$('history-intro').textContent=`${matches.length} dias com desastre registrado nessa amostra; mostro até 7.`;
  const distance=e=>Math.abs(e.chuva1-r1)/Math.max(15,r1+15)+Math.abs(e.chuva3-r3)/Math.max(20,r3+20)+Math.abs(e.chuva6-r6)/Math.max(30,r6+30);
  matches.sort(sortMode==='recent'?(a,b)=>b.data.localeCompare(a.data):(a,b)=>distance(a)-distance(b));
  $('history').innerHTML=matches.slice(0,7).map(e=>{let comparison='Dia usado no ajuste';if(e.ano>=2024){const ratio=e.previsto_contagem>0?e.dano/e.previsto_contagem:0;comparison=`${e.dano>e.previsto_contagem?'Acima':'Abaixo'} da média do teste (${fmt(e.previsto_contagem,1)})`;if(ratio>=.8&&ratio<=1.2)comparison=`Próximo da média do teste (${fmt(e.previsto_contagem,1)})`;}return `<tr><td>${recentDate(e.data)}</td><td>${e.tipologia}${e.protocolos>1?` · ${e.protocolos} protocolos`:''}</td><td class="num">${fmt(e.chuva1,1)} / ${fmt(e.chuva3,1)} / ${fmt(e.chuva6,1)} mm</td><td class="num">${fmt(e.dano)}</td><td>${comparison}</td></tr>`}).join('')||'<tr><td colspan="5" class="empty">Nenhum dia com desastre registrado nesse município na amostra.</td></tr>';
  drawCurve(mun,mon);
}
city.addEventListener('change',update);month.addEventListener('change',update);
for(const [id,mode] of [['sort-near','near'],['sort-recent','recent']])$(id).addEventListener('click',()=>{sortMode=mode;$('sort-near').classList.toggle('active',mode==='near');$('sort-recent').classList.toggle('active',mode==='recent');update()});
update();
})();
