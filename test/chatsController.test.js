import { expect } from 'chai'
import sinon from 'sinon'
import esmock from 'esmock'

const createResponse = () => {
    const res = {
        status: sinon.stub().returnsThis(),
        json: sinon.stub().returnsThis(),
        locals: { sessionId: '1', userId: 'u1' }
    }
    return res
}

describe('chatsController', () => {
    it('queues message on send', async function () {
        this.timeout(5000)
        const fakeQueue = { add: sinon.stub().callsFake(fn => Promise.resolve(fn())) }
        const fakeSendMessage = sinon.stub().resolves()
        const module = await esmock('../controllers/chatsController.js', {
            '../whatsapp.js': {
                getSession: sinon.stub().returns('session'),
                isExists: sinon.stub().resolves(true),
                sendMessage: fakeSendMessage,
                formatPhone: sinon.stub().callsFake(v => v)
            },
            '../sendQueue.js': { default: fakeQueue },
            './../response.js': (res, code, success, message) => {
                res.status(code).json({ success, message })
            }
        })

        const req = { body: { receiver: '123', message: {} }, locals: { sessionId: '1' } }
        const res = createResponse()

        await module.send(req, res)

        expect(fakeQueue.add.calledOnce).to.be.true
        expect(fakeSendMessage.calledOnce).to.be.true
        expect(res.status.calledWith(200)).to.be.true
    })
})
