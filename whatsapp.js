import { rmSync, readdir, mkdirSync } from 'fs'
import { join } from 'path'
import pino from 'pino'
import makeWASocket, {
    useMultiFileAuthState,
    Browsers,
    DisconnectReason,
    fetchLatestBaileysVersion, makeCacheableSignalKeyStore,
    delay,
} from '@whiskeysockets/baileys'
import { makeInMemoryStore } from '@rodrigogs/baileys-store'
//import makeWASocket, { AnyMessageContent, delay, DisconnectReason, fetchLatestBaileysVersion, makeCacheableSignalKeyStore, makeInMemoryStore, MessageRetryMap, useMultiFileAuthState } from 'Baileys/src'
//import MAIN_LOGGER from '../src/Utils/logger'
import { toDataURL } from 'qrcode'
import __dirname from './dirname.js'
import response from './response.js'

const sessions = new Map()
const retries = new Map()
const msgRetryCounterMap = { }

const sessionsDir = (sessionId = '', userId = 'default') => {
    const dir = join(__dirname, 'sessions', userId, sessionId ? sessionId : '')
    mkdirSync(dir, { recursive: true })
    return dir
}

const isSessionExists = (sessionId, userId = 'default') => {
    return sessions.has(`${userId}:${sessionId}`)
}

const shouldReconnect = (sessionId, userId = 'default') => {
    const key = `${userId}:${sessionId}`
    let maxRetries = parseInt(process.env.MAX_RETRIES ?? 0)
    let attempts = retries.get(key) ?? 0

    maxRetries = maxRetries < 1 ? 1 : maxRetries

    if (attempts < maxRetries) {
        ++attempts

        console.log('Reconnecting...', { attempts, sessionId })
        retries.set(key, attempts)

        return true
    }

    return false
}

const createSession = async (sessionId, isLegacy = false, res = null, userId = 'default') => {
    const sessionFile = (isLegacy ? 'legacy_' : 'md_') + sessionId + (isLegacy ? '.json' : '')
    const key = `${userId}:${sessionId}`

    const logger = pino({ level: 'warn' })
    const store = makeInMemoryStore({ logger })

    let state, saveState
    
    ;({ state, saveCreds: saveState } = await useMultiFileAuthState(sessionsDir(sessionFile, userId)))
    
    /**
     * @type {import('@whiskeysockets/baileys').CommonSocketConfig}
     */
    const { version, isLatest } = await fetchLatestBaileysVersion()
    console.log(`using WA v${version.join('.')}, isLatest: ${isLatest}`)
    // const waConfig = {
    //     auth: state,
    //     printQRInTerminal: true,
    //     logger,
    //     browser: Browsers.ubuntu('Chrome'),
    // }
    const waConfig = {
        version,
		logger,
		printQRInTerminal: true,
		auth: {
			creds: state.creds,
			/** caching makes the store faster to send/recv messages */
			keys: makeCacheableSignalKeyStore(state.keys, logger),
		},
		msgRetryCounterMap,
		generateHighQualityLinkPreview: true,
		// implement to handle retries
		getMessage: async key => {
			if(store) {
				const msg = await store.loadMessage(key.remoteJid, key.id)
				return msg?.message || undefined
			}

			// only if store is present
			return {
				conversation: 'hello'
			}
		}
		//shouldIgnoreJid: jid => {
        	//	return jid && jid.endsWith('@newsletter')
    		//}
    }

    /**
     * @type {import('@whiskeysockets/baileys').AnyWASocket}
     */
    const wa = makeWASocket.default(waConfig)

    if (!isLegacy) {
        store.readFromFile(sessionsDir(`${sessionId}_store.json`, userId))
        store.bind(wa.ev)
    }

    sessions.set(key, { ...wa, store, isLegacy })

    wa.ev.on('creds.update', saveState)

    wa.ev.on('chats.set', ({ chats }) => {
        if (isLegacy) {
            store.chats.insertIfAbsent(...chats)
        }
    })

    // Automatically read incoming messages, uncomment below codes to enable this behaviour
    /*
    wa.ev.on('messages.upsert', async (m) => {
        const message = m.messages[0]

        if (!message.key.fromMe && m.type === 'notify') {
            await delay(1000)

            if (isLegacy) {
                await wa.chatRead(message.key, 1)
            } else {
                await wa.sendReadReceipt(message.key.remoteJid, message.key.participant, [message.key.id])
            }
        }
    })
    */

    wa.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect } = update
        const statusCode = lastDisconnect?.error?.output?.statusCode

        if (connection === 'open') {
            retries.delete(key)
        }

        if (connection === 'close') {
            if (statusCode === DisconnectReason.loggedOut || !shouldReconnect(sessionId, userId)) {
                if (res && !res.headersSent) {
                    response(res, 500, false, 'Unable to create session.')
                }

                return deleteSession(sessionId, isLegacy, userId)
            }

            setTimeout(
                () => {
                    createSession(sessionId, isLegacy, res, userId)
                },
                statusCode === DisconnectReason.restartRequired ? 0 : parseInt(process.env.RECONNECT_INTERVAL ?? 0)
            )
        }

        if (update.qr) {
            if (res && !res.headersSent) {
                try {
                    const qr = await toDataURL(update.qr)

                    response(res, 200, true, 'QR code received, please scan the QR code.', { qr })

                    return
                } catch {
                    response(res, 500, false, 'Unable to create QR code.')
                }
            }

            try {
                await wa.logout()
            } catch {
            } finally {
                deleteSession(sessionId, isLegacy, userId)
            }
        }
    })
}

/**
 * @returns {(import('@whiskeysockets/baileys').AnyWASocket|null)}
 */
const getSession = (sessionId, userId = 'default') => {
    return sessions.get(`${userId}:${sessionId}`) ?? null
}

const deleteSession = (sessionId, isLegacy = false, userId = 'default') => {
    const sessionFile = (isLegacy ? 'legacy_' : 'md_') + sessionId + (isLegacy ? '.json' : '')
    const storeFile = `${sessionId}_store.json`
    const rmOptions = { force: true, recursive: true }

    rmSync(sessionsDir(sessionFile, userId), rmOptions)
    rmSync(sessionsDir(storeFile, userId), rmOptions)

    const key = `${userId}:${sessionId}`
    sessions.delete(key)
    retries.delete(key)
}

const getChatList = (sessionId, isGroup = false, userId = 'default') => {
    const filter = isGroup ? '@g.us' : '@s.whatsapp.net'

    return getSession(sessionId, userId).store.chats.filter((chat) => {
        return chat.id.endsWith(filter)
    })
}

/**
 * @param {import('@whiskeysockets/baileys').AnyWASocket} session
 */
const isExists = async (session, jid, isGroup = false) => {
    try {
        let result

        if (isGroup) {
            result = await session.groupMetadata(jid)

            return Boolean(result.id)
        }

        if (session.isLegacy) {
            result = await session.onWhatsApp(jid)
        } else {
            ;[result] = await session.onWhatsApp(jid)
        }

        return result.exists
    } catch {
        return false
    }
}

/**
 * @param {import('@whiskeysockets/baileys').AnyWASocket} session
 */
const sendMessage = async (session, receiver, message, delayMs = 0) => {
    try {
        await session.presenceSubscribe(receiver)
        await delay(100)

        await session.sendPresenceUpdate('composing', receiver)
        await delay(300)

        await session.sendPresenceUpdate('paused', receiver)

        if (delayMs) {
            await delay(parseInt(delayMs))
        }

        return session.sendMessage(receiver, message)
    } catch {
        return Promise.reject(null) // eslint-disable-line prefer-promise-reject-errors
    }
}

const formatPhone = (phone) => {
    if (phone.endsWith('@s.whatsapp.net')) {
        return phone
    }

    let formatted = phone.replace(/\D/g, '')

    return (formatted += '@s.whatsapp.net')
}

const formatGroup = (group) => {
    if (group.endsWith('@g.us')) {
        return group
    }

    let formatted = group.replace(/[^\d-]/g, '')

    return (formatted += '@g.us')
}

const cleanup = () => {
    console.log('Running cleanup before exit.')

    sessions.forEach((session, key) => {
        const [userId, sessionId] = key.split(':')
        if (!session.isLegacy) {
            session.store.writeToFile(sessionsDir(`${sessionId}_store.json`, userId))
        }
    })
}

const init = () => {
    readdir(join(__dirname, 'sessions'), (err, userDirs) => {
        if (err) {
            throw err
        }
        for (const userId of userDirs) {
            if (userId.startsWith('.')) {
                continue
            }
            readdir(sessionsDir('', userId), (err2, files) => {
                if (err2) return
                for (const file of files) {
                    if ((!file.startsWith('md_') && !file.startsWith('legacy_')) || file.endsWith('_store')) {
                        continue
                    }

                    const filename = file.replace('.json', '')
                    const isLegacy = filename.split('_', 1)[0] !== 'md'
                    const sessionId = filename.substring(isLegacy ? 7 : 3)

                    createSession(sessionId, isLegacy, null, userId)
                }
            })
        }
    })
}

export {
    isSessionExists,
    createSession,
    getSession,
    deleteSession,
    getChatList,
    isExists,
    sendMessage,
    formatPhone,
    formatGroup,
    cleanup,
    init,
}
