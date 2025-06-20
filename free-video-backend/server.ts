import server from './src/index'

const { app, port } = server

export default {
	port,
	fetch: app.fetch,
}
