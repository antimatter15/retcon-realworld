import { SQL, useQuery } from '@client/query'
import makeServerProps from '@server/query'
import React from 'react'
import Link from 'next/link'
import { css } from 'styled-components'
import { useUser } from '@client/auth'
import { ArticlePreview, Header } from '@components/RealWorld'
import { useRouter } from 'next/router'

export const getServerSideProps = makeServerProps(App)

export default function App() {
    const query = useQuery()
    return (
        <div>
            <Header />
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

    const PAGE_SIZE = 10

    const criteria =
        view === 'tag'
            ? SQL`WHERE id IN (SELECT post FROM post_tags WHERE tag = ${router.query.tag})`
            : view === 'global'
            ? SQL``
            : SQL`WHERE post.author IN (SELECT user FROM user_follow WHERE follower = ${user.id})`

    const resultCount = query`COUNT(*) FROM post ${criteria}` || 0
    const currentPage = parseInt(router.query.page + '') || 1
    const postList = query.many`FROM post ${criteria} ORDER BY creation_date DESC LIMIT ${PAGE_SIZE} OFFSET ${
        PAGE_SIZE * (currentPage - 1)
    }`
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
                        {postList.map(post => (
                            <ArticlePreview post={post} key={post`id`} />
                        ))}
                        {postList.length === 0 && (
                            <div className="article-preview">No articles are here... yet.</div>
                        )}

                        {resultCount > PAGE_SIZE && (
                            <nav>
                                <ul className="pagination">
                                    {Array.from(new Array(Math.ceil(resultCount / PAGE_SIZE))).map(
                                        (k, i) => (
                                            <li
                                                className={
                                                    'page-item' +
                                                    (i + 1 === currentPage ? ' active' : '')
                                                }
                                            >
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
                                        )
                                    )}
                                </ul>
                            </nav>
                        )}
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
