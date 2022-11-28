import { gql } from '@apollo/client';
import * as Apollo from '@apollo/client';
export type Maybe<T> = T | null;
export type InputMaybe<T> = Maybe<T>;
export type Exact<T extends { [key: string]: unknown }> = { [K in keyof T]: T[K] };
export type MakeOptional<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]?: Maybe<T[SubKey]> };
export type MakeMaybe<T, K extends keyof T> = Omit<T, K> & { [SubKey in K]: Maybe<T[SubKey]> };
const defaultOptions = {} as const;
/** All built-in and custom scalars, mapped to their actual values */
export type Scalars = {
  ID: string;
  String: string;
  Boolean: boolean;
  Int: number;
  Float: number;
};

export type Log = {
  amount?: Maybe<Scalars['Float']>;
  date: Scalars['String'];
  id: Scalars['String'];
  slug?: Maybe<Scalars['String']>;
  title?: Maybe<Scalars['String']>;
  type: LogType;
};

export type LogInput = {
  amount?: InputMaybe<Scalars['Float']>;
  slug?: InputMaybe<Scalars['String']>;
  storageId: Scalars['String'];
  title?: InputMaybe<Scalars['String']>;
  type?: InputMaybe<LogType>;
};

export enum LogType {
  Emptied = 'emptied',
  Mutation = 'mutation'
}

export type Mutation = {
  addLog?: Maybe<Scalars['String']>;
};


export type MutationAddLogArgs = {
  item: LogInput;
};

export type Query = {
  storages: Array<Storage>;
};


export type QueryStoragesArgs = {
  id?: InputMaybe<Scalars['String']>;
};

export type StockItem = {
  amount: Scalars['Float'];
  slug: Scalars['String'];
  title: Scalars['String'];
};

export type Storage = {
  canEmpty: Scalars['Boolean'];
  id: Scalars['String'];
  items: Array<StockItem>;
  logs: Array<Log>;
  order: Scalars['Int'];
  title: Scalars['String'];
};

export type AddLogMutationVariables = Exact<{
  item: LogInput;
}>;


export type AddLogMutation = { addLog?: string | null };

export type StoragesQueryVariables = Exact<{
  storageId?: InputMaybe<Scalars['String']>;
}>;


export type StoragesQuery = { storages: Array<{ id: string, title: string, order: number, canEmpty: boolean, items: Array<{ slug: string, title: string, amount: number }>, logs: Array<{ id: string, type: LogType, date: string, amount?: number | null, slug?: string | null, title?: string | null }> }> };


export const AddLogDocument = gql`
    mutation AddLog($item: LogInput!) {
  addLog(item: $item)
}
    `;
export type AddLogMutationFn = Apollo.MutationFunction<AddLogMutation, AddLogMutationVariables>;

/**
 * __useAddLogMutation__
 *
 * To run a mutation, you first call `useAddLogMutation` within a React component and pass it any options that fit your needs.
 * When your component renders, `useAddLogMutation` returns a tuple that includes:
 * - A mutate function that you can call at any time to execute the mutation
 * - An object with fields that represent the current status of the mutation's execution
 *
 * @param baseOptions options that will be passed into the mutation, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options-2;
 *
 * @example
 * const [addLogMutation, { data, loading, error }] = useAddLogMutation({
 *   variables: {
 *      item: // value for 'item'
 *   },
 * });
 */
export function useAddLogMutation(baseOptions?: Apollo.MutationHookOptions<AddLogMutation, AddLogMutationVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useMutation<AddLogMutation, AddLogMutationVariables>(AddLogDocument, options);
      }
export type AddLogMutationHookResult = ReturnType<typeof useAddLogMutation>;
export type AddLogMutationResult = Apollo.MutationResult<AddLogMutation>;
export type AddLogMutationOptions = Apollo.BaseMutationOptions<AddLogMutation, AddLogMutationVariables>;
export const StoragesDocument = gql`
    query Storages($storageId: String) {
  storages(id: $storageId) {
    id
    title
    order
    canEmpty
    items {
      slug
      title
      amount
    }
    logs {
      id
      type
      date
      amount
      slug
      title
    }
  }
}
    `;

/**
 * __useStoragesQuery__
 *
 * To run a query within a React component, call `useStoragesQuery` and pass it any options that fit your needs.
 * When your component renders, `useStoragesQuery` returns an object from Apollo Client that contains loading, error, and data properties
 * you can use to render your UI.
 *
 * @param baseOptions options that will be passed into the query, supported options are listed on: https://www.apollographql.com/docs/react/api/react-hooks/#options;
 *
 * @example
 * const { data, loading, error } = useStoragesQuery({
 *   variables: {
 *      storageId: // value for 'storageId'
 *   },
 * });
 */
export function useStoragesQuery(baseOptions?: Apollo.QueryHookOptions<StoragesQuery, StoragesQueryVariables>) {
        const options = {...defaultOptions, ...baseOptions}
        return Apollo.useQuery<StoragesQuery, StoragesQueryVariables>(StoragesDocument, options);
      }
export function useStoragesLazyQuery(baseOptions?: Apollo.LazyQueryHookOptions<StoragesQuery, StoragesQueryVariables>) {
          const options = {...defaultOptions, ...baseOptions}
          return Apollo.useLazyQuery<StoragesQuery, StoragesQueryVariables>(StoragesDocument, options);
        }
export type StoragesQueryHookResult = ReturnType<typeof useStoragesQuery>;
export type StoragesLazyQueryHookResult = ReturnType<typeof useStoragesLazyQuery>;
export type StoragesQueryResult = Apollo.QueryResult<StoragesQuery, StoragesQueryVariables>;