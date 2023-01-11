import { list, queryType, stringArg } from 'nexus'
import { Storage } from '..'
import { getFirestore } from 'firebase-admin/firestore'

const queryStorages = queryType({
  nonNullDefaults: {
    input: false,
    output: true
  },
  definition(t) {
    t.field('storages', {
      type: list(Storage),
      args: {
        id: stringArg()
      },
      resolve: async (_, args, ctx) => {
        const firestore = getFirestore()
        if (args.id) {
          ctx.allLogs = true
          const docRef = await firestore.doc(`storages/${args.id}`).get()
          return [{ id: docRef.id, ...docRef.data() }]
        }
        const snapshot = await firestore.collection('storages').orderBy('order').get()
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      }
    })
  }
})

export default queryStorages
