import * as api from '@server/api'
import { getUser } from '@server/auth'
import { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    try {
        const data = JSON.parse(req.body)
        const method = data.path[0]
        if (typeof api[method] !== 'function') {
            throw new Error('Method not found')
        }
        const user = await getUser(req)
        if (!method.startsWith('PUBLIC_') && !user.id) {
            throw new Error('Unauthorized user')
        }
        console.log(data.args)
        const result = await api[method].apply(
            {
                req: req,
                res: res,
                user: user,
            },
            data.args
        )
        res.end(JSON.stringify(result || null))
        return
    } catch (err) {
        res.end(err.toString())
    }
}
