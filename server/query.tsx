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
        let all_sql = ''

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
            all_sql += sql + '\n\n'
            if (sql === '') break
            const db = await dbHandle
            const result = await db.all(sql)
            const new_data = JSON.parse(result[0].data)

            mergeData(tape, data, new_data)
        }
        filterData(tape, data)
        filterTape(tape)

        all_sql += 'Total time: ' + (Date.now() - timeStart)

        return {
            props: {
                user: user,
                tape: tape,
                data: data,
                sql: all_sql,
            },
        }
    }
}

// Since 3.9 (2015-10-14)
export function sqliteCodegen(tape: Tape, pretty = true) {
    const codegen = (ast, query) => {
        query = sqliteTemplate(JSON.parse(query))
        if (ast.t === 0 && ast.miss) return `SELECT ${query}`
        let inner = Object.entries(ast.c || {})
            .map(([query, ast]) => [ast, codegen(ast, query)])
            .filter(([ast, sql]) => sql)
            .map(([ast, sql]) => `'${ast.a}', (${sql})`)
        if (inner.length === 0) return ''
        let fmt = pretty
            ? '\n  ' + inner.join(',\n').replace(/\n/g, '\n  ') + '\n'
            : ' ' + inner.join(',') + ' '
        if (ast.t === 1) return `SELECT json_object(${fmt}) AS ${ast.a} ${query}`
        if (ast.t === 2)
            return `SELECT json_group_array(json(${ast.a})) FROM (SELECT json_object(${fmt}) AS ${ast.a} ${query})`
        return ''
    }
    return codegen(tape, '[[""]]')
}

function escapeSqlite(value) {
    if (value === null) return 'NULL'
    if (Array.isArray(value)) return '(' + value.map(escapeSqlite).join(',') + ')'
    return "'" + (value + '').replace(/'/g, "''") + "'"
}

export function sqliteTemplate(args) {
    const [strings, ...values] = args
    return strings.reduce((prev, cur, i) => prev + escapeSqlite(values[i - 1]) + cur)
}
