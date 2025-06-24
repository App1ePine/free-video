<template>
	<div class="video-search">
		<div class="main-content">
			<!-- 时间显示 -->
			<div class="time-display">
				<div class="current-time">{{ currentTime }}</div>
				<div class="current-date">{{ currentDate }}</div>
			</div>

			<!-- 搜索区域 -->
			<div class="search-section">
				<el-input
					v-model="videoUrl"
					placeholder="请输入视频地址或者视频标题"
					class="search-input"
					size="large"
					clearable
					:loading="isSearching"
					@keyup.enter="handleSearch"
				>
					<template #append>
						<el-button
							type="primary"
							@click="handleSearch"
							:icon="Search"
							:loading="isSearching"
							style="color: white"
						>
							{{ isSearching ? '搜索中' : '搜索' }}
						</el-button>
					</template>
				</el-input>
			</div>

			<!-- 搜索结果区域 -->
			<div v-if="searchResults.length > 0" class="search-results">
				<h3 class="results-title">搜索结果 ({{ searchResults.length }})</h3>

				<el-card
					v-for="item in searchResults"
					:key="item.video_id"
					class="video-card"
					shadow="hover"
				>
					<div class="card-content">
						<!-- 左侧信息 -->
						<div class="video-info">
							<div class="video-poster">
								<img :src="item.cover" :alt="item.title" />
								<div v-if="item.isVip" class="vip-badge">VIP</div>
							</div>
							<div class="video-details">
								<h4 class="video-title">{{ item.title }}</h4>
								<div class="video-meta">
									<span class="year">{{ item.year }}</span>
									<span class="category">{{ item.cat_name }}</span>
									<span class="area" v-if="item.areas && item.areas.length">{{
										item.areas.join('/')
									}}</span>
								</div>
								<div class="video-cast" v-if="item.actList && item.actList.length">
									<span class="cast-label">演员：</span>
									{{ item.actList.slice(0, 3).join('、')
									}}{{ item.actList.length > 3 ? '...' : '' }}
								</div>
								<div class="video-desc">{{ truncateText(item.description, 80) }}</div>
								<div class="video-tags">
									<el-tag v-for="tag in item.tags.slice(0, 4)" :key="tag" size="small">{{
										tag
									}}</el-tag>
								</div>
							</div>
						</div>

						<!-- 右侧集数 -->
						<div class="episodes-container">
							<h5 class="episodes-title">共{{ item.episodeCount }}集</h5>
							<div class="episodes-grid">
								<el-button
									v-for="(link, index) in item.videoLinks.slice(0, 24)"
									:key="index"
									size="small"
									@click="playEpisode(item, link, index)"
									:type="index === 0 ? 'primary' : ''"
								>
									{{ index + 1 }}
								</el-button>
								<el-button
									v-if="item.videoLinks.length > 24"
									size="small"
									@click="showAllEpisodes(item)"
								>
									更多...
								</el-button>
							</div>
						</div>
					</div>
				</el-card>
			</div>

			<!-- 加载中状态 -->
			<div v-if="isSearching" class="loading-container">
				<el-icon class="loading-icon is-loading" size="48"><Loading /></el-icon>
				<p>正在搜索中...</p>
			</div>

			<!-- 无搜索结果时的提示 -->
			<el-empty
				v-if="hasSearched && !isSearching && searchResults.length === 0"
				description="没有找到相关视频"
			></el-empty>

			<!-- 解析支持 -->
			<el-card v-if="!searchResults.length" class="support-card" shadow="hover">
				<div class="support-text">
					<el-icon><VideoPlay /></el-icon>
					解析支持：{{ supportedPlatforms }}、{{ supportedFormats }}
				</div>
			</el-card>

			<!-- 官方网站 -->
			<div v-if="!searchResults.length" class="links">
				<span class="link-text">官方网站：</span>
				<el-link type="primary" href="https://www.iqiyi.com" target="_blank">爱奇艺</el-link>
				<el-link type="primary" href="https://v.qq.com" target="_blank">腾讯视频</el-link>
				<el-link type="primary" href="https://www.youku.com" target="_blank">优酷</el-link>
			</div>

			<!-- 运行时间统计 -->
			<el-card v-if="!searchResults.length" class="runtime-card" shadow="never">
				<div class="runtime-text">
					<el-icon><Timer /></el-icon>
					已运行 {{ runtimeStats }}
				</div>
			</el-card>
		</div>

		<!-- 全部剧集对话框 -->
		<el-dialog
			v-model="episodesDialogVisible"
			:title="`${currentVideo?.title || ''} - 全部剧集`"
			width="80%"
		>
			<div class="all-episodes">
				<el-button
					v-for="(link, index) in currentVideo?.videoLinks"
					:key="index"
					size="default"
					@click="playEpisode(currentVideo, link, index)"
				>
					第{{ index + 1 }}集
				</el-button>
			</div>
		</el-dialog>
	</div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { Search, VideoPlay, Timer, Loading } from '@element-plus/icons-vue'
import { ElMessage } from 'element-plus'
import { useStore } from '../store/index'
import axios from 'axios'

const store = useStore()
const router = useRouter()
const currentTime = ref('')
const currentDate = ref('')
const videoUrl = ref('')
const runtimeStats = ref('')
const isSearching = ref(false)
const hasSearched = ref(false)
const searchResults = ref([])
const episodesDialogVisible = ref(false)
const currentVideo = ref(null)
const supportedPlatforms = store.supportedPlatforms.join('、')
const supportedFormats = store.supportedFormats.join('、')

// 格式化时间
const formatTime = (date) => {
	const hours = String(date.getHours()).padStart(2, '0')
	const minutes = String(date.getMinutes()).padStart(2, '0')
	const seconds = String(date.getSeconds()).padStart(2, '0')
	return `${hours}:${minutes}:${seconds}`
}

// 格式化日期
const formatDate = (date) => {
	const year = date.getFullYear()
	const month = String(date.getMonth() + 1).padStart(2, '0')
	const day = String(date.getDate()).padStart(2, '0')
	const weekdays = ['日', '一', '二', '三', '四', '五', '六']
	const weekday = weekdays[date.getDay()]
	return `${year}-${month}-${day} 星期${weekday}`
}

// 计算运行时间
const calculateRuntime = () => {
	const beginDate = store.appConfig.site_begin_time
	const now = Date.now()
	const diffTime = Math.abs(now - beginDate)
	// 计算年、月、日、小时、分钟、秒
	const days = Math.floor(diffTime / (24 * 60 * 60 * 1000))
	const years = Math.floor(days / 365)
	const remainingDays = days % 365

	const hours = Math.floor((diffTime % (24 * 60 * 60 * 1000)) / (60 * 60 * 1000))
	const minutes = Math.floor((diffTime % (60 * 60 * 1000)) / (60 * 1000))
	const seconds = Math.floor((diffTime % (60 * 1000)) / 1000)

	return `${years} 年 ${remainingDays} 天 ${hours} 小时 ${minutes} 分钟 ${seconds} 秒`
}

// 更新时间
const updateTime = () => {
	const now = new Date()
	currentTime.value = formatTime(now)
	currentDate.value = formatDate(now)
	runtimeStats.value = calculateRuntime()
}

// 截断文本
const truncateText = (text, maxLength) => {
	if (!text) return ''
	return text.length > maxLength ? text.substring(0, maxLength) + '...' : text
}

// 搜索处理
const handleSearch = async () => {
	if (!videoUrl.value.trim()) {
		ElMessage({
			message: '请输入视频链接或搜索关键词',
			type: 'warning',
		})
		return
	}

	// URL验证
	const urlPattern = /^https?:\/\/.+/
	if (urlPattern.test(videoUrl.value)) {
		store.updateCurrentVideo(videoUrl.value)
		router.push('/video_player')
	} else {
		// 执行搜索功能
		try {
			isSearching.value = true
			hasSearched.value = true

			// 调用搜索API
			const response = await axios.get(
				`/api/searchvideo?keyword=${encodeURIComponent(videoUrl.value)}`,
			)
			searchResults.value = response.data || []

			// 更新到store中
			store.updateSearchResults(searchResults.value)

			if (searchResults.value.length === 0) {
				ElMessage.info('未找到相关视频')
			} else {
				ElMessage.success(`找到 ${searchResults.value.length} 个相关视频`)
			}
		} catch (error) {
			if(error.response && error.response.status === 404) {
				console.log('搜索结果未找到')
				ElMessage.warning('未找到相关视频')
			} else {
				console.error('搜索失败:', error)
				ElMessage.error('搜索失败，请稍后重试')
			}
			searchResults.value = []
		} finally {
			isSearching.value = false
		}
	}
}

// 播放指定集数
const playEpisode = (video, videoLink, episodeIndex) => {
	if (!video || !videoLink) return

	// 更新当前视频信息到store，包含所有必要信息
	const videoData = {
		title: video.title,
		cover: video.cover,
		description: video.description,
		videoLinks: video.videoLinks,
	}
	store.updateCurrentVideo(videoData, episodeIndex, videoLink)

	// 提示用户
	ElMessage.success(`正在为您解析: ${video.title} 第${episodeIndex + 1}集`)

	// 跳转到播放页面
	router.push('/video_player')

	// 关闭对话框
	episodesDialogVisible.value = false
}

// 显示全部剧集
const showAllEpisodes = (video) => {
	currentVideo.value = video
	episodesDialogVisible.value = true
}

let timer = null

onMounted(() => {
	updateTime()
	timer = setInterval(updateTime, 1000)

	// 如果store中有搜索结果，则显示
	if (store.search_results && store.search_results.length > 0) {
		searchResults.value = store.search_results
		hasSearched.value = true
	}
})

onUnmounted(() => {
	if (timer) {
		clearInterval(timer)
	}
})
</script>

<style scoped>
.video-search {
	min-height: 100vh;
	background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
	color: white;
	font-family: 'Arial', sans-serif;
}

.main-content {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	min-height: 100vh;
	padding: 20px;
	padding-bottom: 50px;
}

.time-display {
	text-align: center;
	margin-bottom: 30px;
}

.current-time {
	font-size: 4rem;
	font-weight: 300;
	letter-spacing: 0.1em;
	margin-bottom: 10px;
	text-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

.current-date {
	font-size: 1rem;
	opacity: 0.8;
	font-weight: 300;
}

.search-section {
	margin-bottom: 20px;
	width: 100%;
	max-width: 600px;
}

.search-input {
	margin-bottom: 15px;
}

.search-input :deep(.el-input__wrapper) {
	background: rgba(255, 255, 255, 0.1);
	border: 1px solid rgba(255, 255, 255, 0.3);
	backdrop-filter: blur(10px);
}

.search-input :deep(.el-input__inner) {
	color: white;
}

.search-input :deep(.el-input__inner::placeholder) {
	color: rgba(255, 255, 255, 0.6);
}

.search-input :deep(.el-input-group__append) {
	background: rgba(64, 158, 255, 0.8);
	border-color: rgba(64, 158, 255, 0.8);
}

/* 搜索结果样式 */
.search-results {
	width: 100%;
	max-width: 1000px;
	margin-top: 20px;
}

.results-title {
	color: white;
	margin-bottom: 15px;
	padding-left: 5px;
	border-left: 4px solid #409eff;
}

.video-card {
	margin-bottom: 20px;
	border-radius: 8px;
	overflow: hidden;
	background: rgba(255, 255, 255, 0.1);
	backdrop-filter: blur(10px);
}

.video-card :deep(.el-card__body) {
	padding: 15px;
}

.card-content {
	display: flex;
	flex-direction: row;
}

.video-info {
	display: flex;
	flex: 2;
}

.video-poster {
	position: relative;
	width: 140px;
	height: 200px;
	margin-right: 15px;
	overflow: hidden;
	border-radius: 4px;
	flex-shrink: 0;
}

.video-poster img {
	width: 100%;
	height: 100%;
	object-fit: cover;
}

.vip-badge {
	position: absolute;
	top: 5px;
	right: 5px;
	background-color: #f56c6c;
	color: white;
	padding: 2px 6px;
	border-radius: 4px;
	font-size: 12px;
	font-weight: bold;
}

.video-details {
	flex: 1;
}

.video-title {
	font-size: 18px;
	margin: 0 0 8px;
	color: white;
}

.video-meta {
	font-size: 14px;
	color: rgba(255, 255, 255, 0.7);
	margin-bottom: 8px;
}

.video-meta span {
	margin-right: 10px;
}

.video-cast {
	font-size: 13px;
	color: rgba(255, 255, 255, 0.7);
	margin-bottom: 8px;
}

.cast-label {
	color: rgba(255, 255, 255, 0.5);
}

.video-desc {
	font-size: 13px;
	color: rgba(255, 255, 255, 0.6);
	margin-bottom: 12px;
	line-height: 1.4;
}

.video-tags {
	display: flex;
	flex-wrap: wrap;
	gap: 6px;
}

.episodes-container {
	flex: 1;
	margin-left: 20px;
	padding-left: 20px;
	border-left: 1px solid rgba(255, 255, 255, 0.1);
}

.episodes-title {
	font-size: 16px;
	color: white;
	margin: 0 0 10px;
	font-weight: normal;
}

.episodes-grid {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(50px, 1fr));
	gap: 6px;
}

.episodes-grid :deep(.el-button) {
	width: 100%;
	height: 28px;
	margin-left: 6px;
}

.all-episodes {
	display: grid;
	grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
	gap: 10px;
}

.all-episodes :deep(.el-button) {
	width: 100%;
	margin-left: 12px;
}

.support-card {
	margin-top: 20px;
	margin-bottom: 30px;
	background: rgba(255, 255, 255, 0.1);
	border: 1px solid rgba(255, 255, 255, 0.2);
	backdrop-filter: blur(10px);
}

.support-card :deep(.el-card__body) {
	background: transparent;
	border: none;
}

.support-text {
	text-align: center;
	font-size: 14px;
	color: white;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 8px;
}

.links {
	margin-bottom: 30px;
	text-align: center;
	font-size: 14px;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 15px;
}

.link-text {
	color: rgba(255, 255, 255, 0.8);
}

.runtime-card {
	background: rgba(255, 255, 255, 0.05);
	border: 1px solid rgba(255, 255, 255, 0.1);
}

.runtime-card :deep(.el-card__body) {
	background: transparent;
	border: none;
}

.runtime-text {
	text-align: center;
	font-size: 14px;
	color: white;
	margin-bottom: 10px;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 8px;
}

@media (max-width: 768px) {
	.current-time {
		font-size: 2.5rem;
	}

	.search-section {
		max-width: 100%;
		padding: 0 10px;
	}

	.card-content {
		flex-direction: column;
	}

	.video-info {
		margin-bottom: 15px;
	}

	.episodes-container {
		margin-left: 0;
		padding-left: 0;
		border-left: none;
		padding-top: 15px;
		border-top: 1px solid rgba(255, 255, 255, 0.1);
	}

	.links {
		flex-direction: column;
		gap: 10px;
	}
}

/* Element Plus 深色主题适配 */
:deep(.el-link) {
	color: #87ceeb;
}

:deep(.el-link:hover) {
	color: #b3d9f2;
}

:deep(.el-dialog) {
	background: rgba(30, 60, 114, 0.95);
	backdrop-filter: blur(10px);
	border-radius: 10px;
	border: 1px solid rgba(255, 255, 255, 0.1);
}

:deep(.el-dialog__title) {
	color: white;
}

:deep(.el-dialog__headerbtn .el-dialog__close) {
	color: white;
}

:deep(.el-tag) {
	background: rgba(64, 158, 255, 0.2);
	border-color: rgba(64, 158, 255, 0.3);
	color: #87ceeb;
}

:deep(.el-empty__description) {
	color: white;
}

.loading-container {
	display: flex;
	flex-direction: column;
	align-items: center;
	justify-content: center;
	margin: 40px 0;
	color: white;
}

.loading-container p {
	margin-top: 20px;
	font-size: 16px;
}

.loading-icon {
	animation: rotating 2s linear infinite;
	color: #409eff;
}

@keyframes rotating {
	0% {
		transform: rotate(0deg);
	}
	100% {
		transform: rotate(360deg);
	}
}
</style>
