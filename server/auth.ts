import { User } from '@client/auth'
import { IncomingMessage, OutgoingMessage } from 'http'
import cookie from 'cookie'
import jwt from 'jsonwebtoken'

const SESSION_COOKIE_NAME = 'conduit_session'
const SESSION_SECRET = process.env.SESSION_SECRET || 'INSECURE SESSION SECRET'
const SESSION_DURATION = 60 * 60

export async function getUser(req: IncomingMessage): Promise<User> {
    try {
        const cookies = cookie.parse(req.headers['cookie'] || '')
        const decoded = jwt.verify(cookies[SESSION_COOKIE_NAME] || null, SESSION_SECRET)
        return decoded
    } catch (err) {
        return { id: null }
    }
}

export async function setUserCookie(userId, res: OutgoingMessage) {
    res.setHeader(
        'Set-Cookie',
        cookie.serialize(
            SESSION_COOKIE_NAME,
            !userId
                ? ''
                : jwt.sign({ id: userId }, SESSION_SECRET, {
                      expiresIn: SESSION_DURATION,
                  }),
            {
                httpOnly: true,
                maxAge: userId ? SESSION_DURATION : -1,
                path: '/',
                sameSite: 'strict',
            }
        )
    )
}
