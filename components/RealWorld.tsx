import { useQuery } from '@client/query'
import makeServerProps from '@server/query'
import React from 'react'
import Link from 'next/link'
import { css } from 'styled-components'
import { useUser } from '@client/auth'
import { useRouter } from 'next/router'
import RPC, { RPCRefresh } from '@client/rpc'

export function Header() {
    const user = useUser()
    const query = useQuery()
    const router = useRouter()
    const userObject = query.one`FROM user WHERE user.id = ${user.id}`

    const HeaderContents = {
        '/': 'Home',
        '/editor/new': user.id && (
            <>
                <i className="ion-compose"></i>&nbsp;New Post
            </>
        ),
        '/settings': user.id && (
            <>
                <i className="ion-gear-a"></i>&nbsp;Settings
            </>
        ),
        [`/user/${user.id}`]: user.id && (
            <>
                <img
                    src={
                        userObject`picture` ||
                        'https://static.productionready.io/images/smiley-cyrus.jpg'
                    }
                    className="user-pic"
                    alt={userObject`name`}
                />
                {userObject`name`}
            </>
        ),
        '/login': !user.id && 'Sign in',
        '/register': !user.id && 'Sign up',
    }
    return (
        <nav className="navbar navbar-light">
            <div className="container">
                <Link href="/">
                    <a className="navbar-brand">conduit</a>
                </Link>
                <ul className="nav navbar-nav pull-xs-right">
                    {Object.entries(HeaderContents)
                        .filter(([path, link]) => link)
                        .map(([path, link]) => (
                            <li className="nav-item" key={path}>
                                <Link href={path}>
                                    <a
                                        className={
                                            'nav-link' + (router.pathname === path ? ' active' : '')
                                        }
                                    >
                                        {link}
                                    </a>
                                </Link>
                            </li>
                        ))}
                </ul>
            </div>
        </nav>
    )
}

export function ArticlePreview({ post }) {
    const author = post.one`FROM user WHERE user.id = post.author`

    return (
        <div className="article-preview">
            <div className="article-meta">
                <Link href={'/user/' + author`id`}>
                    <a>
                        <img
                            src={
                                author`picture` ||
                                'https://static.productionready.io/images/smiley-cyrus.jpg'
                            }
                        />
                    </a>
                </Link>
                <div className="info">
                    <Link href={'/user/' + author`id`}>
                        <a className="author">{author`name`}</a>
                    </Link>
                    <span className="date">{post`creation_date`}</span>
                </div>
                <div className="pull-xs-right">
                    <FavoriteButton post={post} />
                </div>
            </div>

            <Link href={'/article/' + post`id`}>
                <a className="preview-link">
                    <div style={{ overflow: 'auto' }}>
                        <h1>{post`title`}</h1>
                        <p>{post`description`}</p>
                        <span>Read more...</span>
                        <ul className="tag-list">
                            {post.many`FROM post_tags WHERE post = post.id`.map(tag => (
                                <li
                                    className="tag-default tag-pill tag-outline"
                                    key={tag`id`}
                                >{tag`tag`}</li>
                            ))}
                        </ul>
                    </div>
                </a>
            </Link>
        </div>
    )
}

export function FavoriteButton({ post }) {
    const user = useUser()

    const [isFavorite, setFavorite] = React.useState(
        post`EXISTS(SELECT 1 FROM post_favorite WHERE user = ${user.id} AND post = post.id)`
    )
    const [faveCount, setFaveCount] = React.useState(
        post`COUNT(*) FROM post_favorite WHERE post = post.id`
    )
    const postId = post`id`

    if (!user.id) return null
    if (post`author` + '' === user.id + '') return null

    return (
        <button
            onClick={async e => {
                if (isFavorite) {
                    setFaveCount(await RPC.unfavoritePost(postId))
                } else {
                    setFaveCount(await RPC.favoritePost(postId))
                }
                setFavorite(k => !isFavorite)
            }}
            className={'btn btn-sm' + (isFavorite ? ' btn-primary' : ' btn-outline-primary')}
        >
            <i className="ion-heart"></i>
            <span className="counter">{faveCount > 0 && faveCount}</span>
        </button>
    )
}

export function FollowButton({ user }) {
    const currentUser = useUser()
    const isFollowing = user`EXISTS(SELECT 1 FROM user_follow WHERE follower = ${currentUser.id} AND user = user.id)`
    const userId = user`id`

    if (!currentUser.id) return null
    return userId + '' === currentUser.id + '' ? (
        <Link href="/settings">
            <a className="btn btn-sm btn-outline-secondary action-btn">
                <i className="ion-gear-a"></i>
            </a>
        </Link>
    ) : isFollowing ? (
        <button
            className="btn btn-sm action-btn btn-secondary"
            onClick={e => {
                RPCRefresh.unfollowUser(userId)
            }}
        >
            <i className="ion-plus-round"></i>
            &nbsp; Unfollow {user`name`}
        </button>
    ) : (
        <button
            className="btn btn-sm action-btn btn-outline-secondary"
            onClick={e => {
                RPCRefresh.followUser(userId)
            }}
        >
            <i className="ion-plus-round"></i>
            &nbsp; Follow {user`name`}
        </button>
    )
}

export function PostList({ criteria }) {
    const user = useUser()
    const query = useQuery()
    const router = useRouter()

    const PAGE_SIZE = 10

    const resultCount = query`COUNT(*) FROM post ${criteria}` || 0
    const currentPage = parseInt(router.query.page + '') || 1
    const postList = query.many`FROM post ${criteria} ORDER BY creation_date DESC LIMIT ${PAGE_SIZE} OFFSET ${
        PAGE_SIZE * (currentPage - 1)
    }`
    return (
        <>
            {postList.map(post => (
                <ArticlePreview post={post} key={post`id`} />
            ))}
            {postList.length === 0 && (
                <div className="article-preview">No articles are here... yet.</div>
            )}

            {resultCount > PAGE_SIZE && (
                <nav>
                    <ul className="pagination">
                        {Array.from(new Array(Math.ceil(resultCount / PAGE_SIZE))).map((k, i) => (
                            <li className={'page-item' + (i + 1 === currentPage ? ' active' : '')}>
                                <Link
                                    href={{
                                        query: {
                                            ...router.query,
                                            page: i + 1,
                                        },
                                    }}
                                >
                                    <a className="page-link">{i + 1}</a>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </nav>
            )}
        </>
    )
}
