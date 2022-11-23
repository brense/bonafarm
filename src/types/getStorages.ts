import { list, queryField } from 'nexus'
import { Storage } from './'
import { getFirestore } from 'firebase-admin/firestore'

const getStorages = queryField('storages', {
  type: list(Storage),
  resolve: () => {

  }
})

export default getStorages
