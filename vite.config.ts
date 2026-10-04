import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {copyFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadEnv} from 'vite';

export default defineConfig(({mode})=>{
 const env=loadEnv(mode,process.cwd(),'');
 return {base:env.BASE_PATH||'/',plugins:[react(),{name:'pages-route-fallback',apply:'build',async writeBundle(options){const output=resolve(options.dir||'dist');await copyFile(resolve(output,'index.html'),resolve(output,'404.html'));}}],resolve:{alias:{'@':fileURLToPath(new URL('./src',import.meta.url))}},server:{host:'127.0.0.1',proxy:{'/api':{target:'http://127.0.0.1:3001',changeOrigin:false}}}};
});
