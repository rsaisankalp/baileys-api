import { isSessionExists } from '../whatsapp.js'
import response from './../response.js'

const validate = (req, res, next) => {
    const sessionId = req.query.id ?? req.params.id

    const userId = req.user?.id || 'default'
    if (!isSessionExists(sessionId, userId)) {
        return response(res, 404, false, 'Session not found.')
    }

    res.locals.sessionId = sessionId
    res.locals.userId = userId
    next()
}

export default validate
