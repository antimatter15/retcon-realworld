import cookie from 'cookie'
import bcrypt from 'bcrypt'
import { Req, Res, SQLInsert, User, SQLGet } from './rpc'

const BCRYPT_SALT_ROUNDS = 10

export async function hello() {
    // User()
    // Res()
    // Req()
    return 42
}

export async function favoritePost(postId) {
    const user = User(this)
    await SQLInsert`INSERT INTO post_favorite (post, user) VALUES (${postId}, ${user.id})`
    return (await SQLGet`SELECT COUNT(*) as cnt FROM post_favorite WHERE post = ${postId}`).cnt
}

export async function unfavoritePost(postId) {
    const user = User(this)
    await SQLInsert`DELETE FROM post_favorite WHERE post = ${postId} AND user = ${user.id}`
    return (await SQLGet`SELECT COUNT(*) as cnt FROM post_favorite WHERE post = ${postId}`).cnt
}

export async function followUser(userId) {
    const user = User(this)
    await SQLInsert`INSERT INTO user_follow (follower, user) VALUES (${user.id}, ${userId})`
}

export async function unfollowUser(userId) {
    const user = User(this)
    await SQLInsert`DELETE FROM user_follow WHERE follower = ${user.id} AND user = ${userId}`
}

export async function addComment(postId, message) {
    const user = User(this)
    await SQLInsert`INSERT INTO post_comment (post, author, message) VALUES (${postId}, ${user.id}, ${message})`
}

export async function deleteComment(commentId) {
    const user = User(this)
    let currentComment = await SQLGet`SELECT author FROM post_comment WHERE id = ${commentId}`
    if (!currentComment) throw new Error(`Post not found`)
    if (currentComment.author.toString() !== user.id.toString())
        throw new Error('You can not edit a comment you did not author')
    await SQLInsert`DELETE FROM post_comment WHERE id = ${commentId}`
}

export async function deletePost(postId) {
    const user = User(this)
    let currentPost = await SQLGet`SELECT author FROM post WHERE id = ${postId}`
    if (!currentPost) throw new Error(`Post not found`)
    if (currentPost.author.toString() !== user.id.toString())
        throw new Error('You can not edit a post you did not author')
    await SQLInsert`DELETE FROM post WHERE id = ${postId}`
}

export async function updatePost(postId, title, description, body, tags) {
    const user = User(this)
    let id
    if (postId === 'new') {
        id = await SQLInsert`INSERT INTO post (author, title, description, body) VALUES (${user.id}, ${title}, ${description}, ${body})`
    } else {
        let currentPost = await SQLGet`SELECT author FROM post WHERE id = ${postId}`
        if (!currentPost) throw new Error(`Post not found`)
        if (currentPost.author.toString() !== user.id.toString())
            throw new Error('You can not edit a post you did not author')
        id = postId
        await SQLInsert`
            UPDATE post SET title = ${title}, description = ${description}, body = ${body} WHERE id = ${postId}
        `
    }
    await SQLInsert`DELETE FROM post_tags WHERE post = ${postId}`
    for (let tag of tags) {
        await SQLInsert`INSERT INTO post_tags (post, tag) VALUES (${id}, ${tag})`
    }

    return id
}

export async function updateSettings(profilePic, username, bio, email, password) {
    const user = User(this)
    if (email) {
        try {
            await SQLInsert`UPDATE user SET email = ${email} WHERE id = ${user.id}`
        } catch (err) {
            if (err.message.includes('SQLITE_CONSTRAINT'))
                throw new Error('Email is already registered!')
            throw err
        }
    }
    if (profilePic) await SQLInsert`UPDATE user SET picture = ${profilePic} WHERE id = ${user.id}`
    if (username) await SQLInsert`UPDATE user SET name = ${username} WHERE id = ${user.id}`
    if (bio) await SQLInsert`UPDATE user SET bio = ${bio} WHERE id = ${user.id}`
    if (password) {
        const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS)
        await SQLInsert`UPDATE user SET password = ${hashedPassword} WHERE id = ${user.id}`
    }
}

export async function PUBLIC_register(username, email, password) {
    if (!email) throw new Error('Email must not be blank')
    if (!username) throw new Error('Username must not be blank')
    if (password.length < 8) throw new Error('Password must be at least 8 letters')
    const hashedPassword = await bcrypt.hash(password, BCRYPT_SALT_ROUNDS)
    const picture = `https://picsum.photos/seed/${encodeURIComponent(username)}/200/200`
    try {
        const result = await SQLInsert`INSERT INTO user (name, email, password, picture) VALUES (${username}, ${email}, ${hashedPassword}, ${picture})`
    } catch (err) {
        if (err.message.includes('SQLITE_CONSTRAINT'))
            throw new Error('Email is already registered!')
        throw err
    }
    return await PUBLIC_login.call(this, email, password)
}

export async function PUBLIC_login(email, password) {
    const res = Res(this)
    if (!email) throw new Error('Email must not be blank')
    if (password.length < 8) throw new Error('Password must be at least 8 letters')

    const user = await SQLGet`SELECT id, password FROM user WHERE email = ${email}`
    if (!user) throw new Error('User is not registered!')
    const correctPassword = await bcrypt.compare(password, user.password)
    if (!correctPassword) throw new Error('Wrong password!')

    res.setHeader(
        'Set-Cookie',
        cookie.serialize('__demo_username', user.id, {
            httpOnly: true,
            maxAge: 3600,
            path: '/',
            sameSite: 'strict',
        })
    )
}

export async function PUBLIC_logout() {
    const res = Res(this)
    res.setHeader(
        'Set-Cookie',
        cookie.serialize('__demo_username', '', {
            httpOnly: true,
            maxAge: -1,
            path: '/',
            sameSite: 'strict',
        })
    )
}
