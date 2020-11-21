import { SQL, useQuery } from '@client/query'
import makeServerProps from '@server/query'
import React from 'react'
import Link from 'next/link'
import { css } from 'styled-components'
import { useUser } from '@client/auth'
import { ArticlePreview, Header, PostList } from '@components/RealWorld'
import { useRouter } from 'next/router'

export const getServerSideProps = makeServerProps(App)

export default function App() {
    const query = useQuery()
    return (
        <div>
            <Header title="Home" />
            <Body />
        </div>
    )
}

function Body() {
    const user = useUser()
    const query = useQuery()
    const router = useRouter()

    const view = router.query.tag
        ? 'tag'
        : router.query.view === 'global' || !user.id
        ? 'global'
        : 'follow'

    const criteria =
        view === 'tag'
            ? SQL`WHERE id IN (SELECT post FROM post_tags WHERE tag = ${router.query.tag})`
            : view === 'global'
            ? SQL``
            : SQL`WHERE post.author IN (SELECT user FROM user_follow WHERE follower = ${user.id})`

    return (
        <div className="home-page">
            {!user.id && (
                <div className="banner">
                    <div className="container">
                        <h1 className="logo-font">conduit</h1>
                        <p>A place to share your knowledge.</p>
                    </div>
                </div>
            )}
            <div className="container page">
                <div className="row">
                    <div className="col-md-9">
                        <div className="feed-toggle">
                            <ul className="nav nav-pills outline-active">
                                {user.id && (
                                    <li className="nav-item">
                                        <Link href="/">
                                            <a
                                                className={
                                                    'nav-link' +
                                                    (view === 'follow' ? ' active' : '')
                                                }
                                            >
                                                Your Feed
                                            </a>
                                        </Link>
                                    </li>
                                )}
                                <li className="nav-item">
                                    <Link href="/?view=global">
                                        <a
                                            className={
                                                'nav-link' + (view === 'global' ? ' active' : '')
                                            }
                                        >
                                            Global Feed
                                        </a>
                                    </Link>
                                </li>
                                {router.query.tag && (
                                    <li className="nav-item">
                                        <Link href={'/?tag=' + router.query.tag}>
                                            <a
                                                className={
                                                    'nav-link' + (view === 'tag' ? ' active' : '')
                                                }
                                            >
                                                <i className="ion-pound"></i> {router.query.tag}
                                            </a>
                                        </Link>
                                    </li>
                                )}
                            </ul>
                        </div>
                        <PostList criteria={criteria} />
                    </div>
                    <div className="col-md-3">
                        <div className="sidebar">
                            <p>Popular Tags</p>
                            <div className="tag-list">
                                {query.many`FROM (SELECT DISTINCT xtag.tag FROM post_tags AS xtag 
                                        ORDER BY (SELECT count(*) FROM post_tags AS t WHERE t.tag = xtag.tag) DESC) LIMIT 30`.map(
                                    tag => (
                                        <Link href={'/?tag=' + tag`tag`}>
                                            <a className="tag-default tag-pill">{tag`tag`}</a>
                                        </Link>
                                    )
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
