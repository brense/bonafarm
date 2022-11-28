import { objectType } from 'nexus'

const StockItem = objectType({
  nonNullDefaults: {
    input: true,
    output: true
  },
  name: 'StockItem',
  definition(t) {
    t.string('slug')
    t.string('title')
    t.float('amount')
  }
})

export default StockItem
