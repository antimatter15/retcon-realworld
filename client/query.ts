/* eslint-disable 
    no-restricted-syntax,
    @typescript-eslint/no-use-before-define,
    no-param-reassign,
    no-plusplus,
    no-underscore-dangle */

import React from 'react'

export const QueryContext = React.createContext<Query>(null)

export function useQuery(): Query {
    return React.useContext(QueryContext)
}

export type SQLValue = null | string | number | boolean
export type Weave = [string[], ...SQLValue[]]

type SQLEmbed = SQLValue | SQLFragment<unknown>
type WeaveEmbed = [string[], ...SQLEmbed[]]

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export type SQLFragment<T> = {
    __sqlFragment: Weave
}

// This is the core Query interface that allows us to
// write composable SQL fragments that can be compiled into
// efficient queries

export type Query = {
    // field accessor
    (strings: TemplateStringsArray, ...values: SQLEmbed[]): any
    <T>(query: SQLFragment<T>): T
    <T>(query: SQLFragment<T>): T | null
    <T>(strings: TemplateStringsArray, ...values: SQLEmbed[]): T | null

    // one-to-one relations
    one(strings: TemplateStringsArray, ...values: SQLEmbed[]): Query
    one<T>(query: SQLFragment<T>): Query

    // one-to-many relations
    many(strings: TemplateStringsArray, ...values: SQLEmbed[]): Query[]
    many<T>(query: SQLFragment<T>): Query[]
}

type RootQuery = Query & {
    tape: Tape
}

export type Tape = {
    // alias for tape node
    a: string
    // type for node:
    // 0 = field
    // 1 = one-to-one relation
    // 2 = one-to-many relation
    t: number
    // children of tape node
    c?: { [query: string]: Tape }

    count?: number
    used?: boolean
    miss?: boolean
}

export type Data = {
    [key: string]: SQLValue | Data | Data[]
}

// This is a helper function for working with flat sequences of values
// interleaved with strings.
export function weave(strings: ReadonlyArray<string>, ...values: Weave[]): Weave {
    if (strings.length - 1 !== values.length) throw new Error('Invalid Weave')
    const outStr = [strings[0]]
    const outVal = []
    for (let i = 0; i < values.length; i++) {
        const [s, ...v] = values[i]
        outStr[outStr.length - 1] += s[0]
        for (let j = 0; j < v.length; j++) {
            outStr.push(s[j + 1])
            outVal.push(v[j])
        }
        outStr[outStr.length - 1] += strings[i + 1]
    }
    return [outStr, ...outVal]
}

// This tagged template allows people to create SQL query fragments that
// can be reused or generated elsewhere.
export function SQL<T>(strings: ReadonlyArray<string>, ...values: SQLEmbed[]): SQLFragment<T> {
    if (!Array.isArray(strings) || strings.length !== values.length + 1)
        throw new Error('SQL method must be used as a tagged template')

    return {
        __sqlFragment: weave(
            strings,
            ...values.map(
                (value: SQLEmbed): Weave => {
                    if (value && (value as SQLFragment<unknown>).__sqlFragment)
                        return (value as SQLFragment<unknown>).__sqlFragment
                    return [['', ''], value] as Weave
                }
            )
        ),
    }
}

export function dangerouslyUseRawSQL<T>(sql: { __sql: string }): SQLFragment<T> {
    return { __sqlFragment: [[sql.__sql]] }
}

// This function flattens out the arguments of the tagged template
// and checks it for basic validity. It does not handle escaping values— that
// happens in the code generator.

function encodeQueryArgs(args: [SQLFragment<unknown>] | WeaveEmbed): string {
    if (args.length === 1 && args[0] && (args[0] as SQLFragment<unknown>).__sqlFragment)
        return JSON.stringify((args[0] as SQLFragment<unknown>).__sqlFragment)

    if (args.length === 0 || !Array.isArray(args[0]) || args[0].length != args.length)
        throw new Error(
            'Query methods must used as tagged templates or passed a template SQL object'
        )
    const flat: Weave = SQL(args[0], ...(args.slice(1) as SQLValue[])).__sqlFragment
    return JSON.stringify(flat)
}

// This function creates a Query interface based on a tape
// and a resolved data object which will return the data
// as expected

const ERROR_UNCACHED =
    `Uncached query\n\n` +
    `Try reloading the page. This may occur in development when ` +
    `hot-reloading with code that fetches additional data. ` +
    `Otherwise this may occur when attempting to fetch data ` +
    `from a client-side state update rather than a page navigation. ` +
    `In rarer situations this may be due to differences in the SSR ` +
    `environment and the browser environment.\n`

const ERROR_INVALID_TAPE =
    'Invalid tape data structure: Did you forget to define `getServerSideProps`?'

export function createQuery(
    root: Tape = {
        a: 'data',
        t: 1,
        count: 0,
    },
    rootData = {},
    mutable = true,
    uncachedCallback = null
): RootQuery {
    const make = (tape: Tape, data: Data, stack: string[] = []) => {
        const q = (...args) => helper(tape, data, args, 0, stack)
        q.one = (...args) => helper(tape, data, args, 1, stack)
        q.many = (...args) => helper(tape, data, args, 2, stack)
        return q as RootQuery
    }
    const helper = (parent: Tape, data: Data, args: any, type: number, stack: string[]) => {
        const query = encodeQueryArgs(args)
        const nextStack = [query, ...stack]
        if (!parent) throw new Error(ERROR_INVALID_TAPE)
        if (!parent.c?.[query]) {
            if (mutable) {
                if (!parent.c) parent.c = {}
                parent.c[query] = { a: `a${++root.count}`, t: type }
            } else {
                const err = QueryError(ERROR_UNCACHED, nextStack)
                if (uncachedCallback) return uncachedCallback(err, type)
                throw err
            }
        }
        const tape = parent.c[query]
        if (mutable) tape.used = true
        if (!data || !(tape.a in data)) {
            if (data !== null && mutable) tape.miss = true
        }
        if (tape.t !== type) throw new Error('Query reused with different type')
        if (type === 2) {
            if (data && tape.a in data && !data[tape.a]) return []
            if (!data?.[tape.a] && mutable) return [make(tape, data?.[tape.a] as Data, nextStack)]
            if (!data?.[tape.a]) return []
            if (!Array.isArray(data[tape.a])) throw new Error('Expected data to be an Array')
            return (data[tape.a] as Data[]).map(item => make(tape, item, nextStack))
        }
        if (type === 1) return make(tape, data?.[tape.a] as Data, nextStack)
        return data && data[tape.a]
    }
    const q = make(root, rootData)
    q.tape = root
    if (mutable) {
        root.miss = true
        root.used = true
    }
    return q
}

function QueryError(message: string, stack: string[]): Error {
    const err = new Error(
        `${message}\n${stack.map(k => `> ${printWeave(JSON.parse(k))}`).join('\n')}`
    )
    // Here we mess with the error's stack trace in order to highlight the
    // user's own code, rather than this data fetching library. This is slightly
    // brittle because it hardcodes this filename, but since it only affects
    // dev hot reloading, it'll probably be fine.
    if (err.stack) err.stack = err.stack.replace(/[^\n]+query\.ts[^\n]+\n/g, '')
    return err
}

export function cleanTape(tape: Tape): void {
    delete tape.used
    delete tape.miss
    if (tape.c) for (const key of Object.keys(tape.c)) cleanTape(tape.c[key])
}

export function filterTape(root: Tape): void {
    const helper = (tape: Tape) => {
        delete tape.used
        delete tape.miss
        if (tape.c)
            for (const key of Object.keys(tape.c)) {
                const ast = tape.c[key]
                if (ast.used) {
                    helper(ast)
                } else {
                    delete tape.c[key]
                }
            }
    }

    delete root.count
    helper(root)
}

export function mergeData(tape: Tape, oldData: Data, newData: Data): void {
    if (!tape.c) return
    for (const key of Object.keys(tape.c)) {
        const ast = tape.c[key]
        if (!(ast.a in newData)) {
            // do nothing
        } else if (!oldData[ast.a] || ast.t === 0) {
            oldData[ast.a] = newData[ast.a]
        } else if (ast.t === 1) {
            if (newData[ast.a] !== null) {
                mergeData(ast, oldData[ast.a] as Data, newData[ast.a] as Data)
            } else {
                oldData[ast.a] = null
            }
        } else if (ast.t === 2) {
            if (newData[ast.a] !== null) {
                for (let i = 0; i < (oldData[ast.a] as Data[]).length; i++) {
                    mergeData(ast, oldData[ast.a][i], newData[ast.a][i])
                }
            } else {
                oldData[ast.a] = null
            }
        }
    }
}

export function filterData(tape: Tape, data: Data): void {
    for (const key of Object.keys(tape.c)) {
        const ast = tape.c[key]
        if (!ast.used) {
            delete data[ast.a]
        } else if (ast.t === 1 && data[ast.a]) {
            filterData(ast, data[ast.a] as Data)
        } else if (ast.t === 2 && data[ast.a]) {
            for (let i = 0; i < (data[ast.a] as Data[]).length; i++) {
                filterData(ast, data[ast.a][i])
            }
        }
    }
}

const JSONPreview = (val: SQLValue): string => `{${JSON.stringify(val)}}`

export function printWeave(flat: Weave, escapeFn = JSONPreview): string {
    return flat[0].reduce((acc, cur, i) => acc + escapeFn(flat[i] as SQLValue) + cur)
}

export function indentWeave(flat: Weave): Weave {
    return weave`\n  ${[
        flat[0].map(k => k.replace(/\n/g, '\n  ')),
        ...(flat.slice(1) as SQLValue[]),
    ]}\n`
}

export function isWeaveEmpty(flat: Weave): boolean {
    return flat.length === 1 && flat[0][0] === ''
}
