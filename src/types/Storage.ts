import { nullable, objectType } from 'nexus'
import { getFirestore } from 'firebase-admin/firestore'
import Log from './Log'
import StockItem from './StockItem'

const Storage = objectType({
  nonNullDefaults: {
    input: true,
    output: true
  },
  name: 'Storage',
  definition(t) {
    t.string('id')
    t.string('title')
    t.int('order')
    t.field('image', { type: nullable('String') })
    t.field('color', { type: nullable('String') })
    t.boolean('canEmpty')
    t.list.field('items', {
      type: StockItem,
      resolve: async (root) => {
        if (root.canEmpty) return []
        const firestore = getFirestore()
        const snapshot = await firestore.collection(`storages/${root.id}/logs`).orderBy('date').get()
        return snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() as { type: string, title: string, slug: string, amount: number } }))
          .filter(d => d.type === 'mutation')
          .reduce((arr, { title, slug, amount }) => {
            if (slug) {
              const index = arr.findIndex((d: any) => d.slug === slug)
              index >= 0 ? (arr[index].amount += amount) : arr.push({ title, slug, amount })
            }
            return arr
          }, [] as any[])
          .filter(item => item.amount > 0)
      }
    })
    t.list.field('logs', {
      type: Log,
      resolve: async (root, _, ctx) => {
        const firestore = getFirestore()
        const q = firestore.collection(`storages/${root.id}/logs`).orderBy('date', 'desc')
        const snapshot = await q.limit(ctx.allLogs ? 100 : 3).get()
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data(), date: doc.data().date.toDate().getTime() }))
      }
    })
  }
})

export default Storage
