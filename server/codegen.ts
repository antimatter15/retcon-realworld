import { Weave, weave, isWeaveEmpty, indentWeave, Tape, SQLValue } from '@client/query'

// Since SQLite 3.9 (2015-10-14)
export function sqliteCodegen(root: Tape, pretty = true): Weave {
    const codegen = (tape: Tape, query: Weave): Weave => {
        if (tape.t === 0 && tape.miss) return weave`SELECT ${query}`
        const innerList = Object.entries(tape.c || {})
            .map(([q, child]) => [child, codegen(child, JSON.parse(q))] as [Tape, Weave])
            .filter(([, sql]) => !isWeaveEmpty(sql))
        if (innerList.length === 0) return [['']]
        const inner = innerList
            .map(([ast, sql]) => weave`${[[`'${ast.a}'`]]}, (${sql})`)
            .reduce((prev, cur) => (pretty ? weave`${prev},\n${cur}` : weave`${prev},${cur}`))
        const fmt = pretty ? indentWeave(inner) : inner
        if (tape.t === 1) return weave`SELECT json_object(${fmt}) AS ${[[tape.a]]} ${query}`
        if (tape.t === 2)
            return weave`SELECT json_group_array(json(${[
                [tape.a],
            ]})) FROM (SELECT json_object(${fmt}) AS ${[[tape.a]]} ${query})`
        throw new Error('Invalid Tape!')
    }
    return codegen(root, [['']])
}

// Since Postgres 9.3 (2013-09-09)
export function postgresCodegen(root: Tape, pretty = true): Weave {
    const codegen = (tape: Tape, query: Weave): Weave => {
        if (tape.t === 0 && tape.miss) return weave`SELECT ${query}`
        const innerList = Object.entries(tape.c || {})
            .map(([q, child]) => [child, codegen(child, JSON.parse(q))] as [Tape, Weave])
            .filter(([, sql]) => !isWeaveEmpty(sql))
        if (innerList.length === 0) return [['']]
        const inner = innerList
            .map(([ast, sql]) => weave`(${sql}) AS ${[[ast.a]]}`)
            .reduce((prev, cur) => (pretty ? weave`${prev},\n${cur}` : weave`${prev},${cur}`))
        const fmt = pretty ? indentWeave(inner) : inner
        if (tape.t === 1)
            return weave`SELECT row_to_json(${[[tape.a]]}.*) AS ${[
                [tape.a],
            ]} FROM (SELECT ${fmt} ${query}) AS ${[[tape.a]]}`
        if (tape.t === 2)
            return weave`SELECT json_agg(row_to_json(${[
                [tape.a],
            ]}.*)) FROM (SELECT ${fmt} ${query}) AS ${[[tape.a]]}`
        throw new Error('Invalid Tape!')
    }
    return codegen(root, [['']])
}

export function escapeSQLite(value: SQLValue): string {
    if (value === null) return 'NULL'
    if (Array.isArray(value)) return '(' + value.map(escapeSQLite).join(',') + ')'
    return "'" + (value + '').replace(/'/g, "''") + "'"
}

// https://github.com/segmentio/pg-escape/blob/master/index.js#L119
export function escapePostgres(val: SQLValue): string {
    if (val == null) return 'NULL'
    if (val === true) return 'TRUE'
    if (val === false) return 'FALSE'
    if (typeof val === 'number') {
        return val.toString()
    }
    if (Array.isArray(val)) {
        const vals = val.map(exports.literal)
        return `(${vals.join(', ')})`
    }
    if (typeof val === 'string') {
        const backslash = ~val.indexOf('\\')
        const prefix = backslash ? 'E' : ''
        val = val.replace(/'/g, "''")
        val = val.replace(/\\/g, '\\\\')
        return `${prefix}'${val}'`
    }
    throw new Error('Unsupported value')
}
