const O=require('./engine.js');
const t0=Date.now();
console.log('psat R134a 20C (5.72 bar ref):',O.psat('R134a',20).toFixed(3),' R245fa 20C (1.23 ref):',O.psat('R245fa',20).toFixed(3),' R227ea 20C (3.9):',O.psat('R227ea',20).toFixed(3));
console.log('Tsat R245fa 19.2 bar (paper 119.7):',O.Tsat('R245fa',19.2).toFixed(2));
console.log('Tsat R227ea 28 bar :',O.Tsat('R227ea',28).toFixed(2));
const w=O.wfSide('R134a',10); console.log('R134a 10bar hevp (ref ~ 160?) tevp',w.tevp.toFixed(2),'hevp',w.hevp.toFixed(1),'cpPre',w.cpPre.toFixed(3));
console.log('OHST R227ea 28 bar (paper 129.7):',O.ohst('R227ea',28).toFixed(2));
const pyf=0.7*33.82; console.log('OHST R1234yf 0.7pc (paper 141.6):',O.ohst('R1234yf',pyf).toFixed(2),' sim water (141.2):',O.ohstFromSim('R1234yf',pyf).toFixed(2),' air:',O.ohstFromSim('R1234yf',pyf,{htf:'air'}).toFixed(2),' vp1 (137.3):',O.ohstFromSim('R1234yf',pyf,{htf:'vp1'}).toFixed(2));
let s=O.solveSimple('R227ea',28,140); console.log('R227ea 28bar@140 etaSys (10.38):',(100*s.etaSys).toFixed(2),'exHE (82.65):',(100*s.etaExHE).toFixed(2),s.pinchAt,'x5',s.w.x5.toFixed(3));
for (const n of Object.keys(O.FLUIDS)) { const r=O.optimizeSimple(n,140); console.log(n.padEnd(11), r? `OEP ${r.pOEP.toFixed(2)} bar eta ${(100*r.sol.etaSys).toFixed(2)} ex ${(100*r.sol.etaExHE).toFixed(1)} ${r.sol.pinchAt} x5=${r.sol.w.x5.toFixed(3)}`:'n/a'); }
const d=O.optimizeDual('R245fa','R227ea',140); console.log('dual R245fa+R227ea (11.07 / 86.44) pHT0',d.pHT0.toFixed(2),'pHT',d.pHT.toFixed(2),'eta',(100*d.sol.etaSys).toFixed(2),'ex',(100*d.sol.etaExHE).toFixed(2),'y',d.sol.y.toFixed(3));
const d2=O.optimizeDual('R245fa','R1234yf',140); console.log('dual R245fa+R1234yf (10.53 / 83.1)',(100*d2.sol.etaSys).toFixed(2),(100*d2.sol.etaExHE).toFixed(2));
console.log('ms',Date.now()-t0);
