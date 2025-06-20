import { defineStore } from 'pinia'

export const useStore = defineStore('main', {
	state: () => {
		return {
			prefix_urls: [''],
			search_results: [],
			current_video: {
				title: '', // 视频标题
				episodeIdx: 0, // 当前集数索引
				episodeUrl: '', // 当前播放地址
				totalEpisodes: 0, // 总集数
				coverUrl: '', // 封面
				description: '', // 描述
				videoLinks: [], // 所有剧集的链接
			},
			supportedPlatforms: ['优酷', '爱奇艺', '腾讯视频'],
			supportedFormats: ['MP4', 'M3U8', 'FLV', '...'],
			apiConfig: {
				timeout: 10000, // 请求超时时间（毫秒）
				retryTimes: 3, // 重试次数
			},
			appConfig: {
				title: '免费视频解析',
				description: '支持全网视频解析，免费观看VIP视频',
				version: '1.0.0',
				site_begin_time: new Date('2025-06-20 18:00:00'),
			},
		}
	},
	actions: {
		// 更新搜索结果
		updateSearchResults(results) {
			this.search_results = results
		},

		// 更新当前视频信息 - 综合方法，处理不同情况
		updateCurrentVideo(videoData, episodeIdx = 0, episodeUrl = '') {
			// 处理直接传入URL字符串的情况
			if (typeof videoData === 'string') {
				this.current_video = {
					title: '外部链接',
					episodeIdx: 0,
					episodeUrl: videoData,
					totalEpisodes: 1,
					coverUrl: '',
					description: '',
					videoLinks: [videoData],
				}
				return
			}

			// 处理传入视频对象的情况
			const videoLinks = videoData.videoLinks || []

			this.current_video = {
				title: videoData.title || '未知标题',
				episodeIdx: episodeIdx,
				episodeUrl: episodeUrl || videoLinks[episodeIdx] || '',
				totalEpisodes: videoLinks.length || 0,
				coverUrl: videoData.cover || '',
				description: videoData.description || '',
				videoLinks: videoLinks,
			}
		},

		// 仅更新当前播放URL
		updateEpisodeUrl(url) {
			if (!url) return
			this.current_video.episodeUrl = url
		},

		// 更新当前播放集数
		updateEpisodeIdx(idx) {
			if (idx < 0 || !this.current_video.videoLinks || idx >= this.current_video.videoLinks.length)
				return

			this.current_video.episodeIdx = idx
			this.current_video.episodeUrl = this.current_video.videoLinks[idx]
		},
	},
})
