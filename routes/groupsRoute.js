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
    '/actionOnGroupAddRemovePromoteDemote',
    query('id').notEmpty(),
    body('groupid').notEmpty(),
    body('participantList').notEmpty(),
    body('action').notEmpty(),
    requestValidator,
    sessionValidator,
    controller.actionOnGroupAddRemovePromoteDemote
)

router.post('/removeImagesInFolder', controller.removeImagesInFolder)

router.post('/updateProfile', query('id').notEmpty(), body('groupsToBeUpdated').notEmpty(), requestValidator, sessionValidator, controller.updateProfilePics)

router.post(
    '/createGroup',
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
