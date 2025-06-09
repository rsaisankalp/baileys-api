import { Router } from 'express'
import { body, query } from 'express-validator'
import requestValidator from './../middlewares/requestValidator.js'
import sessionValidator from './../middlewares/sessionValidator.js'
import * as controller from './../controllers/chatsController.js'
import getMessages from './../controllers/getMessages.js'
import { ensureAuth } from '../auth.js'

const router = Router()

router.get('/', ensureAuth, query('id').notEmpty(), requestValidator, sessionValidator, controller.getList)

router.get('/:jid', ensureAuth, query('id').notEmpty(), requestValidator, sessionValidator, getMessages)

router.post(
    '/send',
    ensureAuth,
    query('id').notEmpty(),
    body('receiver').notEmpty(),
    body('message').notEmpty(),
    requestValidator,
    sessionValidator,
    controller.send
)

router.post('/send-bulk', ensureAuth, query('id').notEmpty(), requestValidator, sessionValidator, controller.sendBulk)

export default router
