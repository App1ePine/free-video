import { defineConfig } from '@rsbuild/core'
import { pluginVue } from '@rsbuild/plugin-vue'

export default defineConfig({
	plugins: [pluginVue()],
	server: {
		port: 8080,
		open: true,
		proxy: {
			'/api': {
				target: 'http://localhost:30002',
				changeOrigin: true,
				secure: false,
			},
		},
	},
})
