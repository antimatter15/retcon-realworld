import { User as UserType } from '@client/auth'
import { NextApiRequest, NextApiResponse } from 'next'
import { dbHandle } from './query'

export function Res(scope): NextApiResponse {
    return scope.res
}

export function Req(scope): NextApiRequest {
    return scope.req
}

export function User(scope): UserType {
    return scope.user
}

export async function SQLInsert(strings: TemplateStringsArray, ...values) {
    const db = await dbHandle
    const res = await db.run(strings.join('?'), values)
    return res.lastID
}

export async function SQLAll(strings: TemplateStringsArray, ...values) {
    const db = await dbHandle
    return await db.all(strings.join('?'), values)
}

export async function SQLGet(strings: TemplateStringsArray, ...values) {
    const db = await dbHandle
    return await db.get(strings.join('?'), values)
}
