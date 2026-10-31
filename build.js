const fs=require('fs');
const page=fs.readFileSync('page.html','utf8'), eng=fs.readFileSync('engine.js','utf8');
let tables='';
if (fs.existsSync('data/fluids.json') && fs.existsSync('data/htf.json')) tables='\nORC.useTables('+fs.readFileSync('data/fluids.json','utf8')+','+fs.readFileSync('data/htf.json','utf8')+');';
const out=page.replace('/*ENGINE*/', ()=>eng+tables);
console.log(tables ? 'property tables: CoolProp (inlined)' : 'property tables: none, using Peng-Robinson');
fs.mkdirSync('dist',{recursive:true}); fs.writeFileSync('dist/ohst-explorer.html', out);
// syntax-check each inline script
const re=/<script>([\s\S]*?)<\/script>/g; let m,i=0; while((m=re.exec(out))){ try{ new Function(m[1]); console.log('script',i++,'OK'); }catch(e){ console.log('script',i++,'ERR',e.message);} }
console.log('bytes',out.length);
