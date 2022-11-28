import { enumType, inputObjectType, nonNull, nullable, objectType } from 'nexus'

export const LogType = enumType({
  name: 'LogType',
  members: {
    mutation: 'mutation',
    emptied: 'emptied'
  }
})

export const LogInput = inputObjectType({
  nonNullDefaults: {
    input: false,
    output: true
  },
  name: 'LogInput',
  definition(t) {
    t.field('storageId', { type: nonNull('String') })
    t.string('title')
    t.string('slug')
    t.float('amount')
    t.field('type', { type: LogType })
  },
})

const Log = objectType({
  nonNullDefaults: {
    input: true,
    output: true
  },
  name: 'Log',
  definition(t) {
    t.field('id', { type: 'String' })
    t.field('slug', { type: nullable('String') })
    t.field('title', { type: nullable('String') })
    t.field('amount', { type: nullable('Float') })
    t.field('date', { type: 'String' })
    t.field('type', { type: LogType })
  }
})

export default Log
