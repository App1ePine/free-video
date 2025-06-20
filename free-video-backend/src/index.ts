import { Hono } from 'hono'
import { cors } from 'hono/cors'
import axios from 'axios'

const app = new Hono()

app.use('*', cors())

app.get('/api/searchvideo', async (c) => {
	const url_prefix = 'https://api.so.360kan.com/index?force_v=1&kw='
	const keyword = c.req.query('keyword') || ''
	const url = url_prefix + keyword
	try {
		const response = await axios.get(url, {
			headers: {
				'User-Agent':
					'Mozilla/5.0 (Linux; Android 6.0; Nexus 5 Build/MRA58N) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/137.0.0.0 Mobile Safari/537.36',
			},
		})
		const rows = response.data.data.longData.rows || []
		if (rows.length === 0) {
			return c.json({ error: 'No results found' }, 404)
		}
		const promises = rows.map(async (item: any) => {
			let videoLinks = []
			if (!item.seriesPlaylinks || item.seriesPlaylinks.length === 0) {
				const videoResponse = await axios.get(
					`https://api.so.360kan.com/episodesv2?v_ap=1&s=[{"cat_id":"${item.cat_id}","ent_id":"${item.en_id}","site":"${item.vipSite[0]}"}]`,
				)
				if (videoResponse.data.data.length === 0) {
					return
				}
				videoLinks = videoResponse.data.data[0].seriesHTML.seriesPlaylinks.map((video: any) => {
					return video.url.split('?')[0]
				})
			} else {
				videoLinks = item.seriesPlaylinks.map((video: any) => {
					if (typeof video.url === 'string') {
						return video.url.split('?')[0]
					}
					return video
				})
			}
			const videoItem = {
				video_id: item.id,
				video_id_en: item.en_id,
				cat_id: item.cat_id,
				cat_name: item.cat_name,
				cover: item.cover,
				title: item.titleTxt,
				year: item.year,
				description: item.description,
				areas: item.area,
				tags: item.tag,
				actList: item.actList,
				dirList: item.dirList,
				isVip: item.vip,
				vipSites: item.vipSite,
				videoLinks: videoLinks,
				episodeCount: videoLinks.length,
			}
			return videoItem
		})
		const res = (await Promise.all(promises)).filter(Boolean)
		return c.json(res)
	} catch (e) {
		console.error(e)
		return c.json({ error: 'Failed to fetch data' }, 500)
	}
})

export default { app, port: 30002 }
