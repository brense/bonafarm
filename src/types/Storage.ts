import { objectType } from 'nexus'
import Item from './Item'

const Storage = objectType({
  name: 'Storage',
  definition(t){
    t.string('id')
    t.string('name')
    t.list.field('items', {
      type: Item
    })
  }
})

export default Storage
