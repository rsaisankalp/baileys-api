import { expect } from 'chai'
import { createQueue } from '../sendQueue.js'

const sleep = ms => new Promise(res => setTimeout(res, ms))

describe('sendQueue', () => {
    it('reads concurrency from SEND_CONCURRENCY', () => {
        process.env.SEND_CONCURRENCY = '3'
        const queue = createQueue()
        expect(queue.concurrency).to.equal(3)
    })

    it('limits parallel executions', async () => {
        process.env.SEND_CONCURRENCY = '2'
        const queue = createQueue()
        let running = 0
        let maxRunning = 0

        const makeTask = () => async () => {
            running++
            if (running > maxRunning) maxRunning = running
            await sleep(50)
            running--
        }

        for (let i = 0; i < 4; i++) {
            queue.add(makeTask())
        }

        await queue.onIdle()

        expect(maxRunning).to.equal(2)
    })
})
