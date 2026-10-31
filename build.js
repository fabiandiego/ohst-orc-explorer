const fs=require('fs');
const page=fs.readFileSync('page.html','utf8'), eng=fs.readFileSync('engine.js','utf8');
let tables='';
if (fs.existsSync('data/fluids.json') && fs.existsSync('data/htf.json')) tables='\nORC.useTables('+fs.readFileSync('data/fluids.json','utf8')+','+fs.readFileSync('data/htf.json','utf8')+');';
const out=page.replace('/*ENGINE*/', ()=>eng+tables);
console.log(tables ? 'property tables: CoolProp (inlined)' : 'property tables: none, using Peng-Robinson');
const doc = '<!doctype html>\n<html lang="en">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n<style>[hidden]{display:none!important}img{max-width:100%}</style>\n' + out.replace(/(<\/style>)/, '$1\n</head>\n<body>') + '\n</body>\n</html>\n';
fs.mkdirSync('dist',{recursive:true}); fs.writeFileSync('dist/ohst-explorer.html', out);
// GitHub Pages serves docs/ as a full HTML document
fs.mkdirSync('docs',{recursive:true}); fs.writeFileSync('docs/index.html', doc); fs.writeFileSync('docs/.nojekyll', '');
// syntax-check each inline script
const re=/<script>([\s\S]*?)<\/script>/g; let m,i=0; while((m=re.exec(out))){ try{ new Function(m[1]); console.log('script',i++,'OK'); }catch(e){ console.log('script',i++,'ERR',e.message);} }
console.log('bytes',out.length);
