import { Router } from 'express'
import passport from '../auth.js'

const router = Router()

router.get('/google', passport.authenticate('google', { scope: ['profile', 'email'] }))

router.get('/google/callback',
    passport.authenticate('google', { failureRedirect: '/' }),
    (req, res) => {
        res.redirect('/')
    }
)

router.get('/logout', (req, res) => {
    req.logout && req.logout()
    res.redirect('/')
})

export default router
