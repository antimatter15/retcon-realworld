import React from 'react'

export const QueryContext = React.createContext<Query>(null)

export function useQuery() {
    return React.useContext(QueryContext)
}

// This is the core Query interface that allows us to
// write composable SQL fragments that can be compiled into
// efficient queries

export type Query = {
    // field accessor
    (strings: TemplateStringsArray, ...values: any[]): any
    (query: SQLFragment): any
    <T>(query: SQLFragment): T | null
    <T>(strings: TemplateStringsArray, ...values: any[]): T | null

    // one-to-one relations
    one(strings: TemplateStringsArray, ...values: any[]): Query
    one(query: SQLFragment): Query

    // one-to-many relations
    many(strings: TemplateStringsArray, ...values: any[]): Query[]
    many(query: SQLFragment): Query[]
}

export type TracerQuery = Query & {
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
}

// An object which contains information for the tagged template
// to discourage people from using actual strings directly to avoid
// possible user error leading to SQL injection
export type SQLFragment = {
    __sql: any[]
}

// This tagged template allows people to create SQL query fragments that
// can be reused or generated elsewhere.
export function SQL(strings: TemplateStringsArray, ...values: any[]): SQLFragment {
    if (!Array.isArray(strings) || strings.length !== values.length + 1)
        throw new Error('SQL method must be used as a tagged template')
    return { __sql: flattenSQLFragments([strings, ...values]) }
}

type RootQuery = Query & {
    tape: Tape
}

// This function creates a Query interface based on a tape
// and a resolved data object which will return the data
// as expected

export function createQuery(
    root = {
        a: 'data',
        t: 1,
        count: 0,
    },
    data = {},
    mutable = true
): RootQuery {
    const make = (tape, data, stack = []) => {
        let q = (...args) => helper(tape, data, args, 0, stack)
        q['one'] = (...args) => helper(tape, data, args, 1, stack)
        q['many'] = (...args) => helper(tape, data, args, 2, stack)
        return q
    }
    const helper = (parent, data, args, type, stack) => {
        let query = encode(args)
        let nextStack = [query, ...stack]
        if (!parent)
            throw new Error(
                'Invalid tape data structure: Did you forget to define `getServerSideProps`?'
            )
        if (!parent.c?.[query]) {
            if (mutable) {
                if (!parent.c) parent.c = {}
                parent.c[query] = { a: 'a' + ++root.count, t: type }
            } else {
                throw QueryError(
                    `Uncached query\n\n` +
                        `Try reloading the page. This may occur in development when ` +
                        `hot-reloading with code that fetches additional data.\n` +
                        `Otherwise this may occur when attempting to fetch data ` +
                        `from a client-side state update rather than a page navigation.\n` +
                        `In rarer situations this may be due to differences in the SSR ` +
                        `environment and the browser environment.`,
                    nextStack
                )
            }
        }
        let tape = parent.c[query]
        tape['used'] = true

        if (!data || !(tape.a in data)) {
            if (data !== null) tape['miss'] = true
        }
        if (tape.t !== type) throw new Error('Query reused with different type')
        if (type === 2) {
            if (data && tape.a in data && !data[tape.a]) return []
            if (!data?.[tape.a] && mutable) return [make(tape, data?.[tape.a], nextStack)]
            if (!data?.[tape.a]) return []
            if (!Array.isArray(data[tape.a])) throw new Error('Expected data to be an Array')
            return data[tape.a].map(item => make(tape, item, nextStack))
        }
        if (type === 1) return make(tape, data?.[tape.a], nextStack)
        return data && data[tape.a]
    }
    const q = make(root, data)
    q['tape'] = root
    root['miss'] = true
    root['used'] = true
    return q as any
}

export function cleanTape(tape: Tape) {
    delete tape['used']
    delete tape['miss']
    if (tape.c) for (let key in tape.c) cleanTape(tape.c[key])
}

export function mergeData(tape, oldData, newData) {
    if (!tape.c) return
    for (let key in tape.c) {
        let ast = tape.c[key]
        if (!(ast.a in newData)) continue
        if (!oldData[ast.a] || ast.t === 0) {
            oldData[ast.a] = newData[ast.a]
        } else if (ast.t === 1) {
            if (newData[ast.a] !== null) {
                mergeData(ast, oldData[ast.a], newData[ast.a])
            } else {
                oldData[ast.a] = null
            }
        } else if (ast.t === 2) {
            if (newData[ast.a] !== null) {
                for (let i = 0; i < oldData[ast.a].length; i++) {
                    mergeData(ast, oldData[ast.a][i], newData[ast.a][i])
                }
            } else {
                oldData[ast.a] = null
            }
        }
    }
}

export function filterTape(tape: Tape) {
    delete tape['count']
    const helper = tape => {
        delete tape['used']
        delete tape['miss']
        if (tape.c)
            for (let key in tape.c) {
                let ast = tape.c[key]
                if (ast.used) {
                    helper(ast)
                } else {
                    delete tape.c[key]
                }
            }
    }
    helper(tape)
}

export function filterData(tape, data) {
    for (let key in tape.c) {
        let ast = tape.c[key]
        if (!ast.used) {
            delete data[ast.a]
        } else if (ast.t === 1 && data[ast.a]) {
            filterData(ast, data[ast.a])
        } else if (ast.t === 2 && data[ast.a]) {
            for (let i = 0; i < data[ast.a].length; i++) {
                filterData(ast, data[ast.a][i])
            }
        }
    }
}

function QueryError(message, stack) {
    return new Error(
        `${message}\n${stack.map(k => '> ' + simpleFormatTemplate(JSON.parse(k))).join('\n')}`
    )
}

function simpleFormatTemplate(args) {
    const [strings, ...values] = args
    return strings.reduce((acc, cur, i) => acc + values[i - 1] + cur)
}

// This function prepares flattens out the arguments of the tagged template
// and checks it for basic validity. It does not handle escaping values— that
// happens in the code generator.
function encode(args: any[]): string {
    if (
        args.length === 0 ||
        !args[0] ||
        typeof args[0] !== 'object' ||
        (!(args.length === 1 && args[0].__sql) && args[0].length !== args.length)
    )
        throw new Error(
            'Query methods must used as tagged templates or passed a template SQL object'
        )
    return JSON.stringify(flattenSQLFragments(args[0].__sql ? args[0].__sql : args))
}

// Recursively flatten SQL template objects so we can compose different
// fragments of SQL queries together
function flattenSQLFragments(args: any[]) {
    let [strings, ...values] = args
    let outStrings = [strings[0]],
        outValues = []
    for (let i = 0; i < values.length; i++) {
        if (values[i] && values[i].__sql) {
            let [s, ...v] = flattenSQLFragments(values[i].__sql)
            outStrings[outStrings.length - 1] += s[0]
            for (let j = 0; j < v.length; j++) {
                outStrings.push(s[j + 1])
                outValues.push(v[j])
            }
            outStrings[outStrings.length - 1] += strings[i + 1]
        } else {
            outStrings.push(strings[i + 1])
            outValues.push(values[i])
        }
    }
    return [outStrings, ...outValues]
}
