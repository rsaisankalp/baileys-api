import { Router } from 'express'
import fs from 'fs'
import { join } from 'path'
import fetch from 'node-fetch'
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

router.get('/login', (req, res) => {
    res.render('login', { error: null })
})

router.post('/login', (req, res) => {
    const { email, password } = req.body
    const allowed = readJson(allowedPath).emails || []
    if (email === 'admin@example.com' && password === 'admin') {
        req.session.user = { email, admin: true }
        return res.redirect('/admin')
    }
    if (allowed.includes(email) && password === 'user') {
        req.session.user = { email, admin: false }
        return res.redirect('/groups')
    }
    res.render('login', { error: 'Invalid credentials' })
})

router.get('/logout', (req, res) => {
    req.session.destroy(() => {
        res.redirect('/login')
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

router.get('/admin', ensureAdmin, (req, res) => {
    const allowed = readJson(allowedPath).emails || []
    res.render('admin', { user: req.session.user, allowed })
})

router.post('/admin/add-email', ensureAdmin, (req, res) => {
    const data = readJson(allowedPath)
    data.emails = data.emails || []
    data.emails.push(req.body.email)
    writeJson(allowedPath, data)
    res.redirect('/admin')
})

router.get('/groups', ensureAuth, async (req, res) => {
    try {
        const resp = await fetch('http://localhost:' + (process.env.PORT || 80) + '/groups?id=default')
        const json = await resp.json()
        res.render('groups', { user: req.session.user, groups: json.data || {} })
    } catch {
        res.render('groups', { user: req.session.user, groups: {} })
    }
})

router.get('/lists', ensureAuth, (req, res) => {
    const lists = readJson(listsPath)
    res.render('lists', { user: req.session.user, lists })
})

router.post('/lists/add', ensureAdmin, (req, res) => {
    const lists = readJson(listsPath)
    lists[req.body.name] = req.body.groups.split(',').map(g => g.trim())
    writeJson(listsPath, lists)
    res.redirect('/lists')
})

router.get('/schedules', ensureAdmin, (req, res) => {
    const lists = readJson(listsPath)
    res.render('schedule', { user: req.session.user, lists, schedules })
})

router.post('/schedules/add', ensureAdmin, (req, res) => {
    const { list, message, interval } = req.body
    schedules[list] = { message, interval }
    const groupIds = readJson(listsPath)[list] || []
    const sendLoop = async () => {
        try {
            for (const gid of groupIds) {
                await fetch('http://localhost:' + (process.env.PORT || 80) + '/groups/send?id=default', {
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
