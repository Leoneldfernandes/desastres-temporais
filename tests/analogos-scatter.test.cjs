const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '../dashboard/analogos.js'), 'utf8');
const data = JSON.parse(fs.readFileSync(path.join(__dirname, '../dashboard/analogos.json'), 'utf8'));

class Element {
  constructor(tag='div') {
    this.tag=tag;this.children=[];this.handlers={};this.attrs={};this.dataset={};
    this.clientWidth=736;this.textContent='';this.value='';
  }
  setAttribute(name,value){this.attrs[name]=String(value);}
  appendChild(child){this.children.push(child);return child;}
  replaceChildren(...children){this.children=children;}
  addEventListener(name,handler){this.handlers[name]=handler;}
  getBoundingClientRect(){return {left:0,top:0,width:736,height:360};}
  setPointerCapture(){}
  releasePointerCapture(){}
}

async function setup(){
  const html=fs.readFileSync(path.join(__dirname, '../dashboard/analogos.html'), 'utf8');
  const ids=[...html.matchAll(/id="([^"]+)"/g)].map(match=>match[1]);
  const elements=new Map(ids.map(id=>[id,new Element(id==='rev18-chart'||id==='rev18-scatter'?'svg':'div')]));
  const buttons=['registro','presenca','magnitude'].map(mode=>{
    const button=new Element('button');button.dataset.mode=mode;return button;
  });
  const root=new Element();
  root.querySelector=selector=>elements.get(selector.slice(1));
  root.querySelectorAll=selector=>selector==='[data-mode]'?buttons:[];
  const document={
    documentElement:{scrollHeight:1200},
    getElementById:id=>id==='rev18-analogos'?root:null,
    createElement:tag=>new Element(tag),
    createElementNS:(_,tag)=>new Element(tag)
  };
  const store=new Map();
  const localStorage={getItem:key=>store.get(key)||null,setItem:(key,value)=>store.set(key,value)};
  const window={parent:{postMessage(){}},location:{origin:'https://example.org'}};
  const fetch=async()=>({ok:true,json:async()=>data});
  class ResizeObserver{observe(){}}
  await vm.runInNewContext(source,{document,window,localStorage,fetch,ResizeObserver});
  return {elements,buttons,store};
}

test('municipal scatter shares the existing outcome and rain controls',async()=>{
  const {elements,buttons}=await setup();
  const get=id=>elements.get(id);
  const scatter=get('rev18-scatter');
  assert.equal(scatter.children.filter(child=>child.attrs.class==='scatter-city').length,data.cities.length);
  assert.match(get('rev18-scatter-detail').textContent,/Perfis próximos/);
  get('rev18-rain').handlers.input({target:{value:'80'}});
  assert.match(get('rev18-scatter-detail').textContent,/80 ±/);
  buttons[1].handlers.click();
  assert.match(get('rev18-scatter-scale').textContent,/Protocolos com dano/);
  const city=scatter.children.find(child=>child.attrs.class==='scatter-city');
  city.handlers.click();
  assert.match(get('rev18-scatter-detail').textContent,/SoVI/);
});

test('dragging and clicking the scatter update both charts and save the shared state',async()=>{
  const {elements,store}=await setup();
  const get=id=>elements.get(id);
  const scatter=get('rev18-scatter');
  const original=get('rev18-sovi-value').textContent;
  const pointer=(pointerId,clientX,clientY)=>({pointerId,button:0,clientX,clientY,preventDefault(){},stopPropagation(){}});
  scatter.children.at(-1).handlers.pointerdown(pointer(1,200,270));
  scatter.handlers.pointermove(pointer(1,230,240));
  scatter.handlers.pointerup(pointer(1,230,240));
  assert.notEqual(get('rev18-sovi-value').textContent,original);
  assert.match(get('rev18-support').textContent,/SoVI/);
  assert.equal(JSON.parse(store.get('desastres-temporais-analogos')).icm,Number(get('rev18-icm-value').textContent));
  const afterDrag=get('rev18-sovi-value').textContent;
  const frame=scatter.children.find(child=>child.attrs['data-chart-frame']!==undefined);
  frame.handlers.pointerdown(pointer(2,450,160));
  scatter.handlers.pointerup(pointer(2,450,160));
  assert.notEqual(get('rev18-sovi-value').textContent,afterDrag);
});
