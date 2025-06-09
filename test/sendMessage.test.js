import { expect } from 'chai'
import sinon from 'sinon'
import esmock from 'esmock'

const createSession = () => ({
    presenceSubscribe: sinon.stub().resolves(),
    sendPresenceUpdate: sinon.stub().resolves(),
    sendMessage: sinon.stub().resolves()
})

describe('sendMessage', () => {
    it('sends presence updates before sending message', async () => {
        const delay = sinon.stub().resolves()
        const session = createSession()

        const { sendMessage } = await esmock('../whatsapp.js', {
            '@whiskeysockets/baileys': {
                delay,
                useMultiFileAuthState: sinon.stub(),
                Browsers: {},
                DisconnectReason: {},
                fetchLatestBaileysVersion: sinon.stub(),
                makeCacheableSignalKeyStore: sinon.stub(),
                default: sinon.stub(),
            },
            '@rodrigogs/baileys-store': { makeInMemoryStore: sinon.stub() },
            'pino': sinon.stub(),
            'fs': { rmSync: sinon.stub(), readdir: sinon.stub() },
            'path': { join: sinon.stub().returns('') },
            'qrcode': { toDataURL: sinon.stub() },
            '../response.js': sinon.stub(),
            '../dirname.js': ''
        })

        await sendMessage(session, '123@s.whatsapp.net', { text: 'hi' }, 0)

        expect(session.presenceSubscribe.calledWith('123@s.whatsapp.net')).to.be.true
        expect(session.sendPresenceUpdate.firstCall.args).to.deep.equal(['composing', '123@s.whatsapp.net'])
        expect(session.sendPresenceUpdate.secondCall.args).to.deep.equal(['paused', '123@s.whatsapp.net'])
        expect(session.sendMessage.calledWith('123@s.whatsapp.net', { text: 'hi' })).to.be.true
    })
})
