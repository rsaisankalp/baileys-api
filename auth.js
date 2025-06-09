import passport from 'passport'
import { Strategy as GoogleStrategy } from 'passport-google-oauth20'

const clientID = process.env.GOOGLE_CLIENT_ID
const clientSecret = process.env.GOOGLE_CLIENT_SECRET
const callbackURL = process.env.GOOGLE_CALLBACK_URL || '/auth/google/callback'

if (clientID && clientSecret) {
    passport.use(new GoogleStrategy({ clientID, clientSecret, callbackURL },
        (accessToken, refreshToken, profile, cb) => cb(null, profile)))
}

passport.serializeUser((user, cb) => cb(null, user))
passport.deserializeUser((obj, cb) => cb(null, obj))

export const ensureAuth = (req, res, next) => {
    if (req.isAuthenticated && req.isAuthenticated()) {
        return next()
    }
    res.status(401).json({ success: false, message: 'Unauthorized' })
}

export default passport
