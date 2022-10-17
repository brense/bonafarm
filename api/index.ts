import { nopeusMiddleware } from 'nopeus/utils'
import { makeSchema } from '../src/makeSchema'

const schema = makeSchema()

export default new Promise(async resolve => {
  const { httpServer } = await nopeusMiddleware({ schema })
  resolve(httpServer)
})
