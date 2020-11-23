import React from 'react'
import {
    Query,
    Tape,
    QueryContext,
    createQuery,
    mergeData,
    cleanTape,
    filterData,
    filterTape,
    isWeaveEmpty,
    printWeave,
} from '@client/query'
import { RouterContext } from 'next/dist/next-server/lib/router-context'
import url from 'url'
import { useRouter, createRouter, makePublicRouterInstance } from 'next/router'
import { GetServerSideProps } from 'next'
import ssrPrepass from 'react-ssr-prepass'
import { UserContext } from '@client/auth'
import { getUser } from '@server/auth'

import sqlite3 from 'sqlite3'
import { open } from 'sqlite'
import { escapeSQLite, sqliteCodegen } from './codegen'

export const dbHandle = open({
    filename: './data.db',
    driver: sqlite3.Database,
}).then(async db => {
    await db.migrate()
    return db
})

const MAX_ITERATIONS = 5

export default function makeServerProps(
    Component: React.FunctionComponent<any>
): GetServerSideProps {
    return async function getServerSideProps(ctx) {
        const timeStart = Date.now()
        const user = await getUser(ctx.req)

        let urlInstance = url.parse(ctx.resolvedUrl)
        // Unfortunately there isn't actually a way to get the pathname
        // from this, except perhaps by inverting ctx.params which
        // might be somewhat sketchy.
        const router = makePublicRouterInstance(
            createRouter(urlInstance.pathname, ctx.query, ctx.resolvedUrl, {
                subscription: null as any,
                initialProps: null,
                pageLoader: null,
                App: null as any,
                Component: null as any,
                wrapApp: null as any,
                // initialStyleSheets: null as any,
                isFallback: false,
            })
        )

        const tape = { a: 'data', t: 1, count: 0 }
        let data = {}
        let debug = {
            queries: [],
            time: 0,
        }

        const query = createQuery(tape, data, true)

        for (let i = 0; i < MAX_ITERATIONS; i++) {
            cleanTape(tape)

            await ssrPrepass(
                <QueryContext.Provider value={query}>
                    <UserContext.Provider value={user}>
                        <RouterContext.Provider value={router}>
                            <Component />
                        </RouterContext.Provider>
                    </UserContext.Provider>
                </QueryContext.Provider>
            )

            const sql = sqliteCodegen(tape)
            if (isWeaveEmpty(sql)) break
            debug.queries.push(printWeave(sql, escapeSQLite))
            const db = await dbHandle
            const result = await db.all(sql[0].join('?'), sql.slice(1))
            const new_data = JSON.parse(result[0].data)
            mergeData(tape, data, new_data)
        }
        filterData(tape, data)
        filterTape(tape)

        debug.time = Date.now() - timeStart

        return {
            props: {
                user: user,
                tape: tape,
                data: data,
                debug: debug,
            },
        }
    }
}
