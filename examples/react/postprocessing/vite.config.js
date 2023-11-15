import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import ObjFileImport from 'unplugin-obj/vite';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [ObjFileImport(), react()],
})
