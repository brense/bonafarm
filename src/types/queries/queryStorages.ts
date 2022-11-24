import { list, queryField } from 'nexus'
import { Storage } from '..'
import { getFirestore } from 'firebase-admin/firestore'

const queryStorages = queryField('storages', {
  type: list(Storage),
  resolve: async () => {
    const firestore = getFirestore()
    const docRefs = await firestore.collection('storages').listDocuments()
    const snapshots = await firestore.getAll(...docRefs)
    const storages = snapshots.map(doc => ({ id: doc.id, ...doc.data() }))
    return storages
  }
})

export default queryStorages
