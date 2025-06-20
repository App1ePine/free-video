import { createRouter, createWebHistory } from 'vue-router'
import VideoSearch from '../views/VideoSearch.vue'
import VideoPlayer from '../views/VideoPlayer.vue'

const routes = [
	{
		path: '/',
		name: 'Home',
		component: VideoSearch,
		meta: {
			title: '免费视频解析 - 支持全网视频解析，免费观看VIP视频',
		},
	},
	{
		path: '/video_player',
		name: 'VideoPlayer',
		component: VideoPlayer,
		meta: {
			title: '免费视频解析 - 视频播放器',
		},
	},
]

const router = createRouter({
	history: createWebHistory(),
	routes,
})

// 全局前置守卫
router.beforeEach((to, _from, next) => {
	const title = to.meta.title || '免费视频解析'
	document.title = title
	next()
})

export default router
