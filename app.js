import 'dotenv/config'
import express from 'express'
import nodeCleanup from 'node-cleanup'
import routes from './routes.js'
import webRoutes from './routes/webRoutes.js'
import { init, cleanup } from './whatsapp.js'
import cors from 'cors'
import session from 'express-session'
import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'
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
        secret: process.env.SESSION_SECRET || 'secret',
        resave: false,
        saveUninitialized: false,
    })
)
if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    passport.use(
        new GoogleStrategy(
            {
                clientID: process.env.GOOGLE_CLIENT_ID,
                clientSecret: process.env.GOOGLE_CLIENT_SECRET,
                callbackURL: process.env.GOOGLE_CALLBACK_URL || '/auth/google/callback',
            },
            (accessToken, refreshToken, profile, done) => {
                const email = profile.emails && profile.emails[0] ? profile.emails[0].value : ''
                done(null, { email })
            }
        )
    )
}
passport.serializeUser((user, done) => done(null, user))
passport.deserializeUser((obj, done) => done(null, obj))

app.use(passport.initialize())
app.use(passport.session())
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
