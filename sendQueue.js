import PQueue from 'p-queue'

export const createQueue = () => {
    const concurrency = parseInt(process.env.SEND_CONCURRENCY ?? '5')

    return new PQueue({ concurrency })
}

const queue = createQueue()

export default queue
