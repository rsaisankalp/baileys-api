import { getSession, getChatList, isExists, sendMessage, formatGroup, formatPhone } from './../whatsapp.js'
import response from './../response.js'
// Import {request} from "express";
import request from 'request'
import { delay } from '@whiskeysockets/baileys'
import __dirname from '../dirname.js'
import {createWriteStream, unlinkSync, existsSync, readdir} from 'fs'
import {join} from "path";

const getList = async (req, res) => {
    const session = getSession(res.locals.sessionId)
    let list = await session.groupFetchAllParticipating();
    console.log("participants:",list);
    return response(res, 200, true, '', list);
    //return response(res, 200, true, '', getChatList(res.locals.sessionId, true))
}

const testGroup = async (req, res) => {
    let list = await groupFetchAllParticipating();
    console.log("participants:",list);
    return response(res, 400, true, '', [1,2,3]);
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

    let _participants = []
    for (const [_, participant] of participants.entries()) {
        _participants.push(formatPhone(participant))
    }

    try {
        const data = await session.groupParticipantsUpdate(jid, _participants, action)

        response(res, 200, true, '', data)
    } catch {
        response(res, 500, false, 'Failed to get group metadata.')
    }
}

const createGroup = async (req, res) => {
    const session = getSession(res.locals.sessionId)
    let { groupName, participants, welcomeMessage, description, adminsList, allowOnlyAdmins, imageUrl } = req.body
    console.log("particpants", participants)
    let _participants = []
    for (const [_, participant] of participants.entries()) {
        _participants.push(formatPhone(participant))
    }

    participants = _participants

    let filePath = ''
    if (imageUrl !== null && imageUrl !== '') {
        let fileName = imageUrl.replace(/\./g, '').replace(/\//g, '')
        fileName = res.locals.sessionId + '_' + fileName.slice(fileName.length - 13) + '.png'

        filePath = join(__dirname, 'Media/', fileName)
        if (!existsSync(filePath)) {
            await request(imageUrl)
                .pipe(createWriteStream(filePath))
                .on('close', () => {
                    console.log('downloaded')
                })
            await delay(1000)
        }
    }

    const group = await session.groupCreate(groupName, participants)
    console.log('created group with id: ' + group.id)
    let _adminsList = []
    for (const [_, participant] of adminsList.entries()) {
        _adminsList.push(formatPhone(participant))
    }

    let data = await session.groupUpdateDescription(group.id, description)
    console.log('description updated of groups of' + group.id, data)

    data = await session.updateProfilePicture(group.id, { url: filePath })
    console.log('profile updated of groups of' + group.id, data)


    if (allowOnlyAdmins) {
        await session.groupSettingUpdate(group.id, 'announcement')
    }

    data = await session.groupParticipantsUpdate(group.id, _adminsList, 'promote')
    console.log('Made them as admins' + group.id, data)

    // eslint-disable-next-line no-eq-null,eqeqeq
    if (welcomeMessage != null && welcomeMessage !== '') {
        await session.sendMessage(group.id, { text: welcomeMessage })
    }

    data = await session.groupInviteCode(group.id)
    console.log("group code: " + data)

    response(res, 200, true, '', { invitationId: data, groupid: group.id })
}

const actionOnGroupAddRemovePromoteDemote = async (req, res) => {
    const session = getSession(res.locals.sessionId)
    const {groupid, participantList, action} = req.body

    let _participantList = []
    for (const [_, participant] of participantList.entries()) {
        _participantList.push(formatPhone(participant))
    }

    const data = await session.groupParticipantsUpdate(groupid, _participantList, action)
    console.log('Made the action' + action + ' ' + groupid, data)

    response(res, 200, true, '', 'completed')


}

const updateProfilePics = async (req, res) => {
    const session = getSession(res.locals.sessionId)
    const { groupToCopyFrom, groupsToBeUpdated, description, allowOnlyAdmins, imageUrlLink } = req.body
    if (!groupsToBeUpdated) {
        return response(
            res,
            400,
            false,
            'requires all the parameters in the body groupsToBeUpdated, groupToCopyFrom, image'
        )
    }

    let data = ''
    let imageUrl = ''
    if (imageUrlLink !== '') {
        imageUrl = imageUrlLink
    } else if (groupToCopyFrom !== '') {
        imageUrl = await session.profilePictureUrl(groupToCopyFrom, 'image')
    }

    let fileName = imageUrl.replace(/\./g, '').replace(/\//g, '')
    fileName = res.locals.sessionId + '_' + fileName.slice(fileName.length - 13) + '.png'

    console.log(imageUrl)
    // Const request = require('request')

    //const buffer = ''
    // Await request(imageUrl, (err, resp, _buffer) => {
    //     //console.log(err, resp, _buffer)
    //     buffer = _buffer
    //     // Use the buffer
    //     // buffer contains the image data
    //     // typeof buffer === 'object'
    // })
    // let fileName = "./Media/"+"test.png"


    const filePath = join(__dirname, 'Media/', fileName)
    //const fileName = 'test1.png'
    if (!existsSync(filePath)) {
        await request(imageUrl)
            .pipe(createWriteStream(filePath))
            .on('close', () => {
                console.log('downloaded')
            })
        await delay(1000)
    }

    //const delaying = 1000 * groupsToBeUpdated.entries()
    for (const [key, groupid] of groupsToBeUpdated.entries()) {
        if (!groupid) {
            return response(res, 400, false, 'The group is not exists.')
        }

        data = await session.updateProfilePicture(groupid, { url: filePath })
        console.log(key + 'profile updated of groups of' + groupid, data)
        data = await session.groupUpdateDescription(groupid, description)
        console.log(key + 'description updated of groups of' + groupid, data)
        if (allowOnlyAdmins) {
            await session.groupSettingUpdate(groupid, 'announcement')
        }
        // Await delay(2000)
    }

    //await delay(delaying)
    //await unlinkSync(filePath)

    response(res, 200, true, '', data)
}

const removeImagesInFolder = async (req, res) => {
    const folder = join(__dirname, 'Media/')
    readdir(folder, (err, files) => {
        if (err) {
            throw err
        }

        for (const file of files) {
            console.log(file + ' : File Deleted Successfully.');
            unlinkSync(folder + file)
        }
    })
    response(res, 200, true, '', "successfully deleted")
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



export { getList, getGroupMetaData, getGroupInvite, send, updateProfilePics, participantsUpdate, createGroup, actionOnGroupAddRemovePromoteDemote, removeImagesInFolder, testGroup }
