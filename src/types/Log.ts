import { enumType, nullable, objectType } from 'nexus'

const LogType = enumType({
  name: 'LogType',
  members: {
    mutation: 'mutation',
    emptied: 'emptied'
  }
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
    t.field('amount', { type: nullable('Int') })
    t.field('date', { type: 'String' })
    t.field('type', { type: LogType })
  }
})

export default Log
