import { Router } from 'express'
import { body } from 'express-validator'
import requestValidator from './../middlewares/requestValidator.js'
import sessionValidator from './../middlewares/sessionValidator.js'
import * as controller from './../controllers/sessionsController.js'
import { ensureAuth } from '../auth.js'

const router = Router()

router.get('/find/:id', ensureAuth, sessionValidator, controller.find)

router.get('/status/:id', ensureAuth, sessionValidator, controller.status)

router.post('/add', ensureAuth, body('id').notEmpty(), body('isLegacy').notEmpty(), requestValidator, controller.add)

router.delete('/delete/:id', ensureAuth, sessionValidator, controller.del)

export default router
