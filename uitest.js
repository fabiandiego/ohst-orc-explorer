const fs=require('fs'); const html=fs.readFileSync('dist/ohst-explorer.html','utf8');
const scripts=[...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m=>m[1]);
const defaults={fluid:'R227ea',ths:'140',dtpp:'10',etaT:'0.9',htf:'water',f5fluid:'R245fa',f10a:'R245fa',f10b:'R227ea',dLt:'R227ea',pevpN:'28',thsN:'140',dPht:'19.2',dSplit:'0'};
const els={}; const calls={plots:0};
function mkEl(id){ const e={id,_v:defaults[id],innerHTML:'',textContent:'',className:'',dataset:{},style:{},
 get value(){return this._v}, set value(v){this._v=String(v)},
 querySelector(){return mkEl('_q')}, querySelectorAll(sel){ if(sel==='[data-live]'||sel==='.tex') return Array.from({length:12},()=>mkEl('_x')); return []; },
 addEventListener(){}, setAttribute(){}, removeAttribute(){}, getAttribute(){}, classList:{toggle(){},add(){},remove(){}} }; return e; }
global.window=globalThis; global.document={ getElementById:id=>els[id]||(els[id]=mkEl(id)), documentElement:{style:{setProperty(){}}}, querySelectorAll:()=>[] };
global.getComputedStyle=()=>({getPropertyValue:()=>'#123456'});
global.matchMedia=()=>({matches:false,addEventListener(){}});
global.MutationObserver=class{observe(){}};
global.requestAnimationFrame=f=>setTimeout(()=>f(Date.now()),0); global.cancelAnimationFrame=clearTimeout;
global.Plotly={react:(id,t,l)=>{calls.plots++; for(const tr of t){ for(const k of ['x','y']) if(tr[k]&&tr[k].some(v=>typeof v==='number'&&!isFinite(v))) console.log('NaN in',id,tr.name);} }, restyle(){}};
global.katex={render(){}};
process.on('uncaughtException',e=>{console.log('UNCAUGHT',e.stack);process.exit(1)});
(function(module){ eval(scripts[0]); })(undefined); eval(scripts[1]);
setTimeout(()=>{ console.log('plots drawn',calls.plots); console.log('kpi:',els.dualKpi.innerHTML.replace(/<[^>]+>/g,' ').replace(/\s+/g,' ').slice(0,300)); console.log('f11:',els.f11busy.textContent); console.log('verdict:',els.verdict.innerHTML.replace(/<[^>]+>/g,'')); console.log('repro:',els.repro.innerHTML.replace(/<\/tr>/g,'\n').replace(/<[^>]+>/g,' ').replace(/ +/g,' ')); console.log('fig4:',els.fig4cap.innerHTML.replace(/<[^>]+>/g,'')); },6000);
