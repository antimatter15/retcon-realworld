import { Tape } from '@client/query'

type SQLValue = null | string | number | boolean
export type Lump = [string[], ...SQLValue[]]

// Since SQLite 3.9 (2015-10-14)
export function sqliteCodegen(tape: Tape, pretty = true): Lump {
    const codegen = (tape: Tape, query: Lump): Lump => {
        if (tape.t === 0 && tape.miss) return lump`SELECT ${query}`
        const inner = Object.entries(tape.c || {})
            .map(([q, child]) => [child, codegen(child, JSON.parse(q))] as [Tape, Lump])
            .filter(([_, sql]) => !lumpEmpty(sql))
        if (inner.length === 0) return [['']]
        const inner_concat = inner
            .map(([ast, sql]) => lump`${[[`'${ast.a}'`]]}, (${sql})`)
            .reduce((prev, cur) => (pretty ? lump`${prev},\n${cur}` : lump`${prev},${cur}`))
        const fmt = pretty ? indentLump(inner_concat) : inner_concat
        if (tape.t === 1) return lump`SELECT json_object(${fmt}) AS ${[[tape.a]]} ${query}`
        if (tape.t === 2)
            return lump`SELECT json_group_array(json(${[
                [tape.a],
            ]})) FROM (SELECT json_object(${fmt}) AS ${[[tape.a]]} ${query})`
        throw new Error('Invalid Tape!')
    }
    return codegen(tape, [['']])
}

// Since Postgres 9.3 (2013-09-09)
export function postgresCodegen(tape: Tape, pretty = true): Lump {
    const codegen = (tape: Tape, query: Lump): Lump => {
        if (tape.t === 0 && tape.miss) return lump`SELECT ${query}`
        const inner = Object.entries(tape.c || {})
            .map(([q, child]) => [child, codegen(child, JSON.parse(q))] as [Tape, Lump])
            .filter(([_, sql]) => !lumpEmpty(sql))
        if (inner.length === 0) return [['']]
        const inner_concat = inner
            .map(([ast, sql]) => lump`(${sql}) AS ${[[ast.a]]}`)
            .reduce((prev, cur) => (pretty ? lump`${prev},\n${cur}` : lump`${prev},${cur}`))
        const fmt = pretty ? indentLump(inner_concat) : inner_concat
        if (tape.t === 1)
            return lump`SELECT row_to_json(${[[tape.a]]}.*) AS ${[
                [tape.a],
            ]} FROM (SELECT ${fmt} ${query}) AS ${[[tape.a]]}`
        if (tape.t === 2)
            return lump`SELECT json_agg(row_to_json(${[
                [tape.a],
            ]}.*)) FROM (SELECT ${fmt} ${query}) AS ${[[tape.a]]}`
        throw new Error('Invalid Tape!')
    }
    return codegen(tape, [['']])
}

function lump(strings: TemplateStringsArray, ...values: Lump[]): Lump {
    if (strings.length - 1 !== values.length) throw new Error('Invalid lump')
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

function indentLump(flat: Lump): Lump {
    return lump`\n  ${[
        flat[0].map((k, i) => k.replace(/\n/g, '\n  ')),
        ...(flat.slice(1) as SQLValue[]),
    ]}\n`
}

export function lumpEmpty(flat: Lump): boolean {
    return flat.length === 1 && flat[0][0] === ''
}

const JSONPreview = val => `{${JSON.stringify(val)}}`

export function lumpPreview(flat: Lump, escapeFn = JSONPreview): string {
    return flat[0].reduce((acc, cur, i) => acc + escapeFn(flat[i]) + cur)
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
