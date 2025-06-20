<template>
	<div class="video-player">
		<!-- 视频播放区域 -->
		<div class="player-container">
			<iframe
				v-if="currentPlayUrl"
				:src="currentPlayUrl"
				class="video-frame"
				frameborder="0"
				allowfullscreen
				@load="onFrameLoad"
				@error="onFrameError"
			></iframe>

			<!-- 加载状态 -->
			<div v-if="isLoading" class="loading-container">
				<el-icon class="loading-icon is-loading" size="48">
					<Loading />
				</el-icon>
				<p>正在加载视频...</p>
			</div>

			<!-- 错误状态 -->
			<div v-if="hasError && !isLoading" class="error-container">
				<el-icon size="48"><VideoCamera /></el-icon>
				<p>视频加载失败，请尝试切换解析接口</p>
				<el-button type="primary" @click="showDrawer = true"> 切换接口 </el-button>
			</div>
		</div>

		<!-- 返回首页按钮 -->
		<el-button class="back-btn" type="primary" :icon="ArrowLeft" @click="goBack">
			返回首页
		</el-button>

		<!-- 悬浮切换接口按钮 -->
		<el-button class="switch-btn" type="success" :icon="Setting" circle @click="showDrawer = true">
		</el-button>

		<!-- 切换接口抽屉 -->
		<el-drawer v-model="showDrawer" title="选项" direction="rtl" size="400px">
			<div class="drawer-content">
				<div class="current-info">
					<h4>当前视频地址：</h4>
					<p class="url-text">{{ videoUrl }}</p>
				</div>

				<div class="interface-list">
					<h4>可用解析接口：</h4>
					<div
						v-for="(prefix, index) in prefixes"
						:key="prefix"
						class="interface-item"
						:class="{ active: currentPrefixIndex === index }"
						@click="switchInterface(index)"
					>
						<div class="interface-info">
							<span class="interface-name">接口 {{ index + 1 }}</span>
							<!-- <span class="interface-url">{{ prefix }}</span> -->
						</div>
						<el-icon v-if="currentPrefixIndex === index" class="active-icon">
							<Check />
						</el-icon>
					</div>
				</div>

				<!-- 集数选择（如果有多集） -->
				<div v-if="hasMultipleEpisodes" class="episodes-selector">
					<h4>选集:</h4>
					<div class="episodes-grid">
						<el-button
							v-for="index in totalEpisodes"
							:key="index - 1"
							size="small"
							:type="currentEpisodeIdx === index - 1 ? 'primary' : ''"
							@click="switchEpisode(index - 1)"
							class="episode-btn"
						>
							{{ index }}
						</el-button>
					</div>
				</div>

				<div class="drawer-actions">
					<el-button @click="showDrawer = false" type="danger"> 关闭 </el-button>
				</div>
			</div>
		</el-drawer>
	</div>
</template>

<script setup>
import { ref, onMounted, computed, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ArrowLeft, Setting, VideoCamera, Check, Loading } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useStore } from '../store/index'

const store = useStore()
const route = useRoute()
const router = useRouter()

// 响应式数据
const videoUrl = ref('')
const prefixes = ref([])
const currentPrefixIndex = ref(0)
const showDrawer = ref(false)
const isLoading = ref(true)
const hasError = ref(false)

// 视频信息
const videoTitle = computed(() => {
	if (store.current_video && store.current_video.title) {
		if (hasMultipleEpisodes.value) {
			return `${store.current_video.title} - 第 ${store.current_video.episodeIdx + 1} 集`
		}
		return store.current_video.title
	}
	return ''
})

const currentEpisodeIdx = computed(() => store.current_video.episodeIdx || 0)
const totalEpisodes = computed(() => store.current_video.totalEpisodes || 0)
const hasMultipleEpisodes = computed(() => totalEpisodes.value > 1)

// 计算当前播放URL
const currentPlayUrl = computed(() => {
	if (!videoUrl.value || !prefixes.value.length) return ''
	const prefix = prefixes.value[currentPrefixIndex.value]
	return prefix + encodeURIComponent(videoUrl.value)
})

// 更新页面标题
const updatePageTitle = () => {
	let title = '视频播放器'
	if (videoTitle.value) {
		title = `${videoTitle.value} - 免费视频解析`
	}
	document.title = title
}

// 监听视频信息变化更新页面标题
watch(videoTitle, () => {
	updatePageTitle()
})

// 监听 store 中的 current_video_url 变化
watch(
	() => store.current_video.episodeUrl,
	(newValue) => {
		if (newValue) {
			videoUrl.value = newValue
			loadCurrentInterface()
			updatePageTitle()
		}
	},
)

onMounted(() => {
	// 初始化解析接口列表
	prefixes.value = store.prefix_urls || []

	// 获取当前视频URL
	if (store.current_video && store.current_video.episodeUrl) {
		videoUrl.value = store.current_video.episodeUrl
	} else {
		// 如果store中没有，尝试从路由获取
		videoUrl.value = route.query.url || ''
		// 如果获取到了URL但没有视频信息，则更新
		if (videoUrl.value && (!store.current_video || !store.current_video.episodeUrl)) {
			store.updateEpisodeUrl(videoUrl.value)
		}
	}

	if (!videoUrl.value) {
		ElMessage.error('视频地址错误')
		router.push('/')
		return
	}

	if (prefixes.value.length === 0) {
		ElMessage.error('没有可用的解析接口')
		router.push('/')
		return
	}

	// 更新页面标题
	updatePageTitle()

	// 开始加载第一个接口
	loadCurrentInterface()
})

// 监听接口切换
watch(currentPrefixIndex, () => {
	loadCurrentInterface()
})

// 加载当前接口
const loadCurrentInterface = () => {
	isLoading.value = true
	hasError.value = false
}

// iframe加载完成
const onFrameLoad = () => {
	isLoading.value = false
	hasError.value = false
	ElMessage.success(`接口 ${currentPrefixIndex.value + 1} 加载成功`)
}

// iframe加载错误
const onFrameError = () => {
	isLoading.value = false
	hasError.value = true
	ElMessage.error(`接口 ${currentPrefixIndex.value + 1} 加载失败`)
}

// 切换接口
const switchInterface = (index) => {
	if (index === currentPrefixIndex.value) return

	currentPrefixIndex.value = index
	showDrawer.value = false
	ElMessage.info(`正在切换到接口 ${index + 1}`)
}

// 切换集数
const switchEpisode = (index) => {
	if (index === currentEpisodeIdx.value) return

	store.updateEpisodeIdx(index)
	ElMessage.success(`正在切换到第${index + 1}集`)
	showDrawer.value = false
}

// 返回首页
const goBack = () => {
	router.push('/')
}
</script>

<style scoped>
.video-player {
	position: relative;
	width: 100%;
	height: 100vh;
	background: #000;
}

.player-container {
	width: 100%;
	height: 100%;
	position: relative;
}

.video-frame {
	width: 100%;
	height: 100%;
	border: none;
}

.loading-container,
.error-container {
	position: absolute;
	top: 50%;
	left: 50%;
	transform: translate(-50%, -50%);
	text-align: center;
	color: white;
}

.loading-container p,
.error-container p {
	margin-top: 20px;
	font-size: 16px;
}

.loading-icon {
	animation: rotating 2s linear infinite;
}

@keyframes rotating {
	0% {
		transform: rotate(0deg);
	}
	100% {
		transform: rotate(360deg);
	}
}

.back-btn {
	position: fixed;
	top: 20px;
	left: 20px;
	z-index: 1000;
}

.switch-btn {
	position: fixed;
	bottom: 60px;
	right: 30px;
	z-index: 1000;
	width: 45px;
	height: 45px;
	font-size: 24px;
}

.drawer-content {
	padding: 20px;
}

.current-info {
	margin-bottom: 30px;
	padding: 15px;
	background: #f5f5f5;
	border-radius: 8px;
}

.current-info h4 {
	margin: 0 0 10px 0;
	color: #333;
}

.url-text {
	margin: 0;
	word-break: break-all;
	color: #666;
	font-size: 14px;
}

.interface-list h4 {
	margin: 0 0 15px 0;
	color: #333;
}

.interface-item {
	display: flex;
	justify-content: space-between;
	align-items: center;
	padding: 15px;
	margin-bottom: 10px;
	border: 1px solid #e0e0e0;
	border-radius: 8px;
	cursor: pointer;
	transition: all 0.3s;
}

.interface-item:hover {
	border-color: #409eff;
	background: #f0f9ff;
}

.interface-item.active {
	border-color: #67c23a;
	background: #f0f9f0;
}

.interface-info {
	display: flex;
	flex-direction: column;
	flex: 1;
}

.interface-name {
	font-weight: bold;
	color: #333;
	margin-bottom: 5px;
}

.interface-url {
	font-size: 12px;
	color: #999;
	word-break: break-all;
}

.active-icon {
	color: #67c23a;
	font-size: 18px;
}

.drawer-actions {
	margin-top: 30px;
	display: flex;
	gap: 10px;
}

@media (max-width: 768px) {
	.back-btn {
		top: 10px;
		left: 10px;
	}

	.switch-btn {
		bottom: 20px;
		right: 20px;
		width: 50px;
		height: 50px;
		font-size: 20px;
	}
}
.episodes-selector {
	margin-top: 30px;
	border-top: 1px solid #e0e0e0;
	padding-top: 20px;
}

.episodes-selector h4 {
	margin: 0 0 15px 0;
	color: #333;
}

.episodes-grid {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
}

.episodes-grid :deep(.el-button) {
	flex: 0 0 48px;
	width: 48px;
	height: 32px;
	padding: 0;
	margin: 0;
}
</style>
