import { getSession, getChatList, isExists, sendMessage, formatPhone } from './../whatsapp.js'
import sendQueue from '../sendQueue.js'
import response from './../response.js'

const getList = (req, res) => {
    return response(res, 200, true, '', getChatList(res.locals.sessionId))
}

const send = async (req, res) => {
    const session = getSession(res.locals.sessionId)
    const receiver = formatPhone(req.body.receiver)
    const { message } = req.body

    try {
        const exists = await isExists(session, receiver)

        if (!exists) {
            return response(res, 400, false, 'The receiver number is not exists.')
        }

        sendQueue
            .add(() => sendMessage(session, receiver, message, 0))
            .catch(() => {})

        response(res, 200, true, 'The message has been queued for sending.')
    } catch {
        response(res, 500, false, 'Failed to send the message.')
    }
}

const sendBulk = async (req, res) => {
    const session = getSession(res.locals.sessionId)
    const errors = []
    const tasks = []

    for (const [key, data] of req.body.entries()) {
        let { receiver, message, delay } = data

        if (!receiver || !message) {
            errors.push(key)

            continue
        }

        if (!delay || isNaN(delay)) {
            delay = 1000
        }

        receiver = formatPhone(receiver)

        tasks.push(
            (async () => {
                try {
                    const exists = await isExists(session, receiver)

                    if (!exists) {
                        errors.push(key)

                        return
                    }

                    sendQueue
                        .add(() => sendMessage(session, receiver, message, delay))
                        .catch(() => errors.push(key))
                } catch {
                    errors.push(key)
                }
            })()
        )
    }

    await Promise.all(tasks)

    if (errors.length === 0) {
        return response(res, 200, true, 'All messages have been queued for sending.')
    }

    const isAllFailed = errors.length === req.body.length

    response(
        res,
        isAllFailed ? 500 : 200,
        !isAllFailed,
        isAllFailed ? 'Failed to queue all messages.' : 'Some messages have been queued.',
        { errors }
    )
}

export { getList, send, sendBulk }
