import { useQuery } from '@client/query'
import makeServerProps from '@server/query'
import React from 'react'
import Link from 'next/link'
import { css } from 'styled-components'
import { useUser } from '@client/auth'
import { ArticlePreview, FollowButton, Header } from '@components/RealWorld'
import { useRouter } from 'next/router'
import { RPCRefresh } from '@client/rpc'

export const getServerSideProps = makeServerProps(App)

export default function App() {
    const query = useQuery()
    const router = useRouter()
    const userId = router.query.user
    const userObject = query.one`FROM user WHERE id = ${userId}`
    const view = router.query.view

    const postList =
        view === 'favorite'
            ? userObject.many`FROM post_favorite WHERE user = user.id`.map(
                  fave => fave.one`FROM post WHERE post.id = post_favorite.post`
              )
            : userObject.many`FROM post WHERE post.author = user.id`

    return (
        <div>
            <Header />
            <div className="profile-page">
                <div className="user-info">
                    <div className="container">
                        <div className="row">
                            <div className="col-xs-12 col-md-10 offset-md-1">
                                <img
                                    src={
                                        userObject`picture` ||
                                        'https://static.productionready.io/images/smiley-cyrus.jpg'
                                    }
                                    className="user-img"
                                />
                                <h4>{userObject`name`}</h4>
                                <p>{userObject`bio`}</p>
                                <FollowButton user={userObject} />
                            </div>
                        </div>
                    </div>
                </div>
                <div className="container">
                    <div className="row">
                        <div className="col-xs-12 col-md-10 offset-md-1">
                            <div className="articles-toggle">
                                <ul className="nav nav-pills outline-active">
                                    <li className="nav-item">
                                        <Link href={'/user/' + userId}>
                                            <a
                                                className={
                                                    'nav-link' +
                                                    (view === 'favorite' ? '' : ' active')
                                                }
                                            >
                                                My Articles
                                            </a>
                                        </Link>
                                    </li>
                                    <li className="nav-item">
                                        <Link href={'/user/' + userId + '?view=favorite'}>
                                            <a
                                                className={
                                                    'nav-link' +
                                                    (view === 'favorite' ? ' active' : '')
                                                }
                                            >
                                                Favorited Articles
                                            </a>
                                        </Link>
                                    </li>
                                </ul>
                            </div>
                            <div>
                                {postList.map(post => (
                                    <ArticlePreview post={post} key={post`id`} />
                                ))}
                                {postList.length === 0 && (
                                    <div className="article-preview">
                                        No articles are here... yet.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
