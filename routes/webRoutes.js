import { Router } from 'express'
import fs from 'fs'
import { join } from 'path'
import fetch from 'node-fetch'
import passport from 'passport'
import __dirname from '../dirname.js'

const router = Router()

const allowedPath = join(__dirname, 'allowedEmails.json')
const listsPath = join(__dirname, 'lists.json')
const schedules = {}

const readJson = (file) => {
    if (!fs.existsSync(file)) return {}
    return JSON.parse(fs.readFileSync(file))
}
const writeJson = (file, data) => {
    fs.writeFileSync(file, JSON.stringify(data, null, 2))
}

router.get('/', (req, res) => {
    if (!req.session.user) return res.redirect('/login')
    if (req.session.user.admin) return res.redirect('/admin')
    if (!req.session.phone) return res.redirect('/scan')
    res.redirect('/groups')
})

router.get('/login', (req, res) => {
    const unauthorized = req.query.unauthorized === '1'
    res.render('login', { unauthorized })
})

router.get(
    '/auth/google',
    passport.authenticate('google', { scope: ['profile', 'email'] })
)

router.get(
    '/auth/google/callback',
    passport.authenticate('google', { failureRedirect: '/login' }),
    (req, res) => {
        const data = readJson(allowedPath)
        const email = req.user.email
        const admins = data.admins || []
        const users = data.users || []
        if (admins.includes(email)) {
            req.session.user = { email, admin: true }
            return res.redirect('/admin')
        }
        if (users.includes(email)) {
            req.session.user = { email, admin: false }
            return res.redirect('/groups')
        }
        req.logout(() => {})
        res.redirect('/login?unauthorized=1')
    }
)

router.get('/logout', (req, res) => {
    req.logout(() => {
        req.session.destroy(() => {
            res.redirect('/login')
        })
    })
})

const ensureAuth = (req, res, next) => {
    if (!req.session.user) return res.redirect('/login')
    next()
}

const ensureAdmin = (req, res, next) => {
    if (!req.session.user || !req.session.user.admin) return res.redirect('/login')
    next()
}

const ensurePhone = async (req, res, next) => {
    if (!req.session.phone) return res.redirect('/scan')
    // verify session status
    try {
        const resp = await fetch('https://wa.vaidicpujas.in/sessions/status/' + req.session.phone)
        const json = await resp.json()
        if (json.data && json.data.status === 'authenticated') return next()
    } catch {}
    return res.redirect('/scan')
}

router.get('/admin', ensureAdmin, (req, res) => {
    const data = readJson(allowedPath)
    res.render('admin', { user: req.session.user, allowed: data })
})

router.post('/admin/add-email', ensureAdmin, (req, res) => {
    const data = readJson(allowedPath)
    data.users = data.users || []
    data.users.push(req.body.email)
    writeJson(allowedPath, data)
    res.redirect('/admin')
})

router.get('/groups', ensureAuth, ensurePhone, async (req, res) => {
    try {
        const resp = await fetch(
            'http://localhost:' + (process.env.PORT || 80) + '/groups?id=' + req.session.phone
        )
        const json = await resp.json()
        res.render('groups', { user: req.session.user, groups: json.data || {} })
    } catch {
        res.render('groups', { user: req.session.user, groups: {} })
    }
})

router.get('/scan', ensureAuth, (req, res) => {
    const phone = req.session.phone || null
    res.render('scan', { user: req.session.user, qr: null, phone, status: null })
})

router.post('/scan', ensureAuth, async (req, res) => {
    const phone = '91' + req.body.phone.replace(/\D/g, '')
    req.session.phone = phone
    try {
        const resp = await fetch('https://wa.vaidicpujas.in/sessions/add', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({ id: phone, isLegacy: 'false' })
        })
        const json = await resp.json()
        const qr = json.data ? json.data.qr : null
        res.render('scan', { user: req.session.user, qr, phone, status: 'pending' })
    } catch {
        res.render('scan', { user: req.session.user, qr: null, phone, status: 'error' })
    }
})

router.get('/scan/status', ensureAuth, async (req, res) => {
    const phone = req.query.phone || req.session.phone
    try {
        const resp = await fetch('https://wa.vaidicpujas.in/sessions/status/' + phone)
        const json = await resp.json()
        const status = json.data ? json.data.status : 'unknown'
        if (status === 'authenticated') req.session.phone = phone
        res.render('scan', { user: req.session.user, qr: null, phone, status })
    } catch {
        res.render('scan', { user: req.session.user, qr: null, phone, status: 'error' })
    }
})

router.get('/lists', ensureAuth, ensurePhone, (req, res) => {
    const all = readJson(listsPath)
    const lists = all[req.session.user.email] || {}
    res.render('lists', { user: req.session.user, lists })
})

router.post('/lists/add', ensureAuth, ensurePhone, (req, res) => {
    const data = readJson(listsPath)
    data[req.session.user.email] = data[req.session.user.email] || {}
    let groups = req.body.groups
    if (!Array.isArray(groups)) groups = String(groups).split(',')
    data[req.session.user.email][req.body.name] = groups.map((g) => g.trim())
    writeJson(listsPath, data)
    res.redirect('/lists')
})

router.post('/lists/send', ensureAuth, ensurePhone, async (req, res) => {
    const { list, message } = req.body
    const data = readJson(listsPath)
    const groupIds = (data[req.session.user.email] || {})[list] || []
    try {
        for (const gid of groupIds) {
            await fetch(
                'http://localhost:' + (process.env.PORT || 80) + '/groups/send?id=' + req.session.phone,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ receiver: gid, message: { text: message } })
                }
            )
        }
    } catch {}
    res.redirect('/lists')
})

router.get('/schedules', ensureAuth, ensurePhone, (req, res) => {
    const data = readJson(listsPath)
    const lists = data[req.session.user.email] || {}
    res.render('schedule', { user: req.session.user, lists, schedules })
})

router.post('/schedules/add', ensureAuth, ensurePhone, (req, res) => {
    const { list, message, interval } = req.body
    schedules[list] = { message, interval }
    const data = readJson(listsPath)
    const groupIds = (data[req.session.user.email] || {})[list] || []
    const sendLoop = async () => {
        try {
            for (const gid of groupIds) {
                await fetch('http://localhost:' + (process.env.PORT || 80) + '/groups/send?id=' + req.session.phone, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ receiver: gid, message: { text: message } })
                })
            }
        } catch {}
    }
    schedules[list].timer = setInterval(sendLoop, parseInt(interval))
    res.redirect('/schedules')
})

export default router
