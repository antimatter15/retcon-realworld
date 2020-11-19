import { useQuery } from '@client/query'
import makeServerProps from '@server/query'
import React from 'react'

export const getServerSideProps = makeServerProps(App)

export default function App() {
    const query = useQuery()
    return <div>Hello {query`CURRENT_TIMESTAMP`}</div>
}
