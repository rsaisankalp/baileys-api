import { getSession, getChatList, isExists, sendMessage, formatGroup, formatPhone } from './../whatsapp.js'
import response from './../response.js'
// Import {request} from "express";
import request from 'request'
import { delay } from '@adiwajshing/baileys'
import { createWriteStream, unlinkSync } from 'fs'

const getList = (req, res) => {
    return response(res, 200, true, '', getChatList(res.locals.sessionId, true))
}

const getGroupMetaData = async (req, res) => {
    const session = getSession(res.locals.sessionId)
    //console.log("@@@@ session"+JSON.stringify(session))
    const { jid } = req.params

    try {
        const data = await session.groupMetadata(jid)

        if (!data.id) {
            return response(res, 400, false, 'The group is not exists.')
        }

        response(res, 200, true, '', data)
    } catch {
        response(res, 500, false, 'Failed to get group metadata.')
    }
}

const getGroupInvite = async (req, res) => {
    const session = getSession(res.locals.sessionId)
    const { jid } = req.params

    try {
        const data = await session.groupInviteCode(jid)

        response(res, 200, true, '', data)
    } catch {
        response(res, 500, false, 'Failed to get group metadata.')
    }
}

const participantsUpdate = async (req, res) => {
    const session = getSession(res.locals.sessionId)
    const { jid, participants, action } = req.body

    try {
        const data = await session.groupParticipantsUpdate(jid, participants, action)

        if (!data.id) {
            return response(res, 400, false, 'The group is not exists.')
        }

        response(res, 200, true, '', data)
    } catch {
        response(res, 500, false, 'Failed to get group metadata.')
    }
}

const createGroup = async (req, res) => {
    const session = getSession(res.locals.sessionId)
    const { groupName, participants, welcomeMessage } = req.body

    for (const [key, participant] of participants) {
        participants[key] = formatPhone(participant)
    }

    const group = await session.groupCreate(groupName, participants)
    console.log('created group with id: ' + group.gid)
    session.sendMessage(group.id, { text: welcomeMessage }) // Say hello to everyone on the group
}

const updateProfilePics = async (req, res) => {
    const session = getSession(res.locals.sessionId)
    const { groupToCopyFrom, groupsToBeUpdated, description } = req.body
    if (!groupsToBeUpdated || !groupToCopyFrom) {
        return response(
            res,
            400,
            false,
            'requires all the parameters in the body groupsToBeUpdated, groupToCopyFrom, image'
        )
    }

    let data = ''
    const imageUrl = await session.profilePictureUrl(groupToCopyFrom, 'image')
    console.log(imageUrl)
    // Const request = require('request')

    const buffer = ''
    // Await request(imageUrl, (err, resp, _buffer) => {
    //     //console.log(err, resp, _buffer)
    //     buffer = _buffer
    //     // Use the buffer
    //     // buffer contains the image data
    //     // typeof buffer === 'object'
    // })
    // let fileName = "./Media/"+"test.png"

    const filePath = '/Users/admin/nodejsCode/whatsva/baileys-api/Media/'
    const fileName = 'test1.png'
    await request(imageUrl)
        .pipe(createWriteStream(filePath + fileName))
        .on('close', () => {
            console.log('downloaded')
        })
    await delay(1000)
    console.log(buffer)
    console.log('imageUrl', imageUrl)
    const delaying = 1000 * groupsToBeUpdated.entries()
    for (const [key, groupid] of groupsToBeUpdated.entries()) {
        if (!groupid) {
            return response(res, 400, false, 'The group is not exists.')
        }

        data = await session.updateProfilePicture(groupid, { url: 'https://whapi.io/assets/img/whapi.io.png' })
        console.log(key + 'profile updated of groups of' + groupid, data)
        data = await session.groupUpdateDescription(groupid, description)
        console.log(key + 'description updated of groups of' + groupid, data)
        // Await delay(2000)
    }

    await delay(delaying)
    await unlinkSync(filePath + fileName)

    response(res, 200, true, '', data)
}

const send = async (req, res) => {
    const session = getSession(res.locals.sessionId)
    const receiver = formatGroup(req.body.receiver)
    const { message } = req.body

    try {
        const exists = await isExists(session, receiver, true)

        if (!exists) {
            return response(res, 400, false, 'The group is not exists.')
        }

        await sendMessage(session, receiver, message)

        response(res, 200, true, 'The message has been successfully sent.')
    } catch {
        response(res, 500, false, 'Failed to send the message.')
    }
}

export { getList, getGroupMetaData, getGroupInvite, send, updateProfilePics, participantsUpdate }
