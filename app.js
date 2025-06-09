import 'dotenv/config'
import express from 'express'
import nodeCleanup from 'node-cleanup'
import routes from './routes.js'
import webRoutes from './routes/webRoutes.js'
import { init, cleanup } from './whatsapp.js'
import cors from 'cors'
import session from 'express-session'
import path from 'path'
import __dirname from './dirname.js'

const app = express()
app.set('view engine', 'ejs')
app.set('views', path.join(__dirname, 'views'))

const host = process.env.HOST || undefined
const port = parseInt(process.env.PORT ?? 80)
console.log("@@@host and port"+host.toString()+" "+port.toString())
app.use(cors())
app.use(express.urlencoded({ extended: true }))
app.use(express.json())
app.use(
    session({
        secret: 'secret',
        resave: false,
        saveUninitialized: false,
    })
)
app.use('/', webRoutes)
app.use('/', routes)

const listenerCallback = () => {
    init()
    console.log(`Server is listening on http://${host ? host : 'localhost'}:${port}`)
}

app.listen(port, listenerCallback)
// if (host) {
//     console.log("enter 1"+" "+port+" "+host)
//     app.listen(port, host, listenerCallback)
// } else {
//     console.log("enter 2"+" "+port+" ")
//     app.listen(port, listenerCallback)
// }

nodeCleanup(cleanup)

export default app
