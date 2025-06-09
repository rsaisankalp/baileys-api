import { Router } from 'express'
import { body, query } from 'express-validator'
import requestValidator from './../middlewares/requestValidator.js'
import sessionValidator from './../middlewares/sessionValidator.js'
import * as controller from './../controllers/groupsController.js'
import getMessages from './../controllers/getMessages.js'
import { ensureAuth } from '../auth.js'

const router = Router()

router.get('/', ensureAuth, query('id').notEmpty(), requestValidator, sessionValidator, controller.getList)

router.get('/:jid', ensureAuth, query('id').notEmpty(), requestValidator, sessionValidator, getMessages)

router.get('/meta/:jid', ensureAuth, query('id').notEmpty(), requestValidator, sessionValidator, controller.getGroupMetaData)

router.get('/invite/:jid', ensureAuth, query('id').notEmpty(), requestValidator, sessionValidator, controller.getGroupInvite)

router.get('/tester', ensureAuth, query('id').notEmpty(), requestValidator, sessionValidator, controller.testGroup)

router.post(
    '/actionOnGroupAddRemovePromoteDemote',
    ensureAuth,
    query('id').notEmpty(),
    body('groupid').notEmpty(),
    body('participantList').notEmpty(),
    body('action').notEmpty(),
    requestValidator,
    sessionValidator,
    controller.actionOnGroupAddRemovePromoteDemote
)

router.post('/removeImagesInFolder', ensureAuth, controller.removeImagesInFolder)

router.post('/updateProfile', ensureAuth, query('id').notEmpty(), body('groupsToBeUpdated').notEmpty(), requestValidator, sessionValidator, controller.updateProfilePics)

router.post(
    '/createGroup',
    ensureAuth,
    query('id').notEmpty(),
    body('groupName').notEmpty(),
    body('participants').notEmpty(),
    body('description').notEmpty(),
    requestValidator,
    sessionValidator,
    controller.createGroup
)

router.post(
    '/participantsUpdate',
    ensureAuth,
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
    ensureAuth,
    query('id').notEmpty(),
    body('receiver').notEmpty(),
    body('message').notEmpty(),
    requestValidator,
    sessionValidator,
    controller.send
)

export default router
