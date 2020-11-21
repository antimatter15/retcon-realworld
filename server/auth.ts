import { User } from '@client/auth'
import { IncomingMessage } from 'http'
import cookie from 'cookie'

export async function getUser(req: IncomingMessage): Promise<User> {
    const cookies = cookie.parse(req.headers['cookie'] || '')
    const user = cookies['__demo_username'] || null

    return {
        id: user,
    }
}
