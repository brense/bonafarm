import { objectType } from 'nexus'

const Item = objectType({
  name: 'Item',
  definition(t){
    t.string('id')
    t.string('name')
  }
})

export default Item
