import { User } from '@client/auth'
import { NextApiRequest, NextApiResponse } from 'next'
// import { db } from './query'
// import SQLTemplate from 'sql-template-strings'
// import { User as UserType } from '@client/auth'

export function Res(scope): NextApiResponse {
    return scope.res
}

export function Req(scope): NextApiRequest {
    return scope.req
}

export function User(scope): User {
    return scope.user
}

// export async function SQL(strings: TemplateStringsArray, ...values) {
//     return await db.query(SQLTemplate(strings, ...values))
// }

// export async function SQLMany(strings: TemplateStringsArray, ...values) {
//     return await db.all(strings.join('?'), values)
// }

// export async function SQLOne(strings: TemplateStringsArray, ...values) {
//     return await db.get(strings.join('?'), values)
// }

// export async function SQLRun(strings: TemplateStringsArray, ...values) {
//     const res = await db.run(strings.join('?'), values)
//     return res.lastID
// }
