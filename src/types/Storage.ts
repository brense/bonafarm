import { objectType } from 'nexus'
import { getFirestore } from 'firebase-admin/firestore'
import Item from './Item'

const Storage = objectType({
  name: 'Storage',
  definition(t) {
    t.string('id')
    t.string('name')
    t.list.field('items', {
      type: Item,
      resolve: async (root) => {
        const firestore = getFirestore()
        const docRefs = await firestore.collection(`storages/${root.id}/items`).listDocuments()
        const snapshots = await firestore.getAll(...docRefs)
        const items = snapshots.map(doc => ({ id: doc.id, ...doc.data() }))
        return items
      }
    })
  }
})

export default Storage
