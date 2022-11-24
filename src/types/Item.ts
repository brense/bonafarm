import { objectType } from 'nexus'

const Item = objectType({
  name: 'Item',
  definition(t){
    t.string('name')
    t.float('amount')
  }
})

export default Item
