import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import {fileURLToPath} from 'node:url';
export default defineConfig({base:process.env.BASE_PATH||'/',plugins:[react()],resolve:{alias:{'@':fileURLToPath(new URL('./src',import.meta.url))}},server:{host:'127.0.0.1',proxy:{'/api':{target:'http://127.0.0.1:3001',changeOrigin:false}}}});
