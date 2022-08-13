import { Router } from 'express'
import { body, query } from 'express-validator'
import requestValidator from './../middlewares/requestValidator.js'
import sessionValidator from './../middlewares/sessionValidator.js'
import * as controller from './../controllers/groupsController.js'
import getMessages from './../controllers/getMessages.js'

const router = Router()

router.get('/', query('id').notEmpty(), requestValidator, sessionValidator, controller.getList)

router.get('/:jid', query('id').notEmpty(), requestValidator, sessionValidator, getMessages)

router.get('/meta/:jid', query('id').notEmpty(), requestValidator, sessionValidator, controller.getGroupMetaData)

router.get('/invite/:jid', query('id').notEmpty(), requestValidator, sessionValidator, controller.getGroupInvite)

router.post(
    '/updateProfile',
    query('id').notEmpty(),
    body('groupsToBeUpdated').notEmpty(),
    body('groupToCopyFrom').notEmpty(),
    body('description').notEmpty(),
    requestValidator,
    sessionValidator,
    controller.updateProfilePics
)

router.post(
    '/participantsUpdate',
    query('id').notEmpty(),
    body('jid').notEmpty(),
    body('participants').notEmpty(),
    body('action').notEmpty(),
    requestValidator,
    sessionValidator,
    controller.participantsUpdate
)

router.post(
    '/send',
    query('id').notEmpty(),
    body('receiver').notEmpty(),
    body('message').notEmpty(),
    requestValidator,
    sessionValidator,
    controller.send
)

export default router
