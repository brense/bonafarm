import { createContext } from 'react'
import type { Feed, Item, Storage, StorageType } from '../model/types.ts'

export type DocMap<T> = ReadonlyMap<string, T>

export interface OrgDataValue {
  feeds: DocMap<Feed>
  storages: DocMap<Storage>
  storageTypes: DocMap<StorageType>
  items: DocMap<Item>
  /** True until every collection has delivered its first snapshot. */
  loading: boolean
  error: string | null
}

export const EMPTY_ORG_DATA: OrgDataValue = {
  feeds: new Map(),
  storages: new Map(),
  storageTypes: new Map(),
  items: new Map(),
  loading: true,
  error: null,
}

export const OrgDataContext = createContext<OrgDataValue>(EMPTY_ORG_DATA)
