import { mutationType } from 'nexus'
import { getFirestore, Timestamp } from 'firebase-admin/firestore'
import { LogInput } from '../Log'

const addLog = mutationType({
  nonNullDefaults: {
    input: true,
    output: false
  },
  definition(t) {
    t.field('addLog', {
      type: 'String',
      args: {
        item: LogInput
      },
      resolve: async (_, args, ctx) => {
        const firestore = getFirestore()
        if (args.item) {
          const { type = 'mutation', storageId, ...rest } = args.item
          const docRef = await firestore.collection(`storages/${storageId}/logs`).add({ type, date: Timestamp.now(), ...rest })
          return docRef.id
        }
        return ''
      }
    })
  }
})

export default addLog
