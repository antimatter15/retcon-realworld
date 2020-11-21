import { SQL, useQuery } from '@client/query'
import makeServerProps from '@server/query'
import React from 'react'
import Link from 'next/link'
import { css } from 'styled-components'
import { useUser } from '@client/auth'
import { ArticlePreview, FollowButton, Header, PostList } from '@components/RealWorld'
import { useRouter } from 'next/router'
import { RPCRefresh } from '@client/rpc'

export const getServerSideProps = makeServerProps(App)

export default function App() {
    const query = useQuery()
    const router = useRouter()
    const userId = router.query.user
    const user = query.one`FROM user WHERE id = ${userId}`
    const view = router.query.view

    const criteria =
        view === 'favorite'
            ? SQL`WHERE id IN (SELECT post FROM post_favorite WHERE user = ${userId})`
            : SQL`WHERE author = ${userId}`

    return (
        <div>
            <Header title={user`name`} />
            <div className="profile-page">
                <div className="user-info">
                    <div className="container">
                        <div className="row">
                            <div className="col-xs-12 col-md-10 offset-md-1">
                                <img
                                    src={
                                        user`picture` ||
                                        'https://static.productionready.io/images/smiley-cyrus.jpg'
                                    }
                                    className="user-img"
                                />
                                <h4>{user`name`}</h4>
                                <p>{user`bio`}</p>
                                <FollowButton user={user} />
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
                            <PostList criteria={criteria} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
