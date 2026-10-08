import {cp,mkdir,rm} from 'node:fs/promises';
await rm('dist',{recursive:true,force:true});await mkdir('dist',{recursive:true});
for(const file of ['index.html','styles.css','icon.svg','manifest.webmanifest','sw.js','.nojekyll','src','vendor','icons'])await cp(file,`dist/${file}`,{recursive:true});
console.log('Static game exported to dist/');
