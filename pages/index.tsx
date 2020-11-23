import { SQL, useQuery } from '@client/query'
import makeServerProps from '@server/query'
import React from 'react'
import Link from 'next/link'
import { useUser } from '@client/auth'
import { ArticlePreview, Header, NavPages, PostList, TabNavigation } from '@components/RealWorld'
import { useRouter } from 'next/router'

export const getServerSideProps = makeServerProps(App)

export default function App() {
    const user = useUser()
    const query = useQuery()
    const router = useRouter()
    const tag = router.query.tag as string
    const view = tag ? 'tag' : router.query.view === 'global' || !user.id ? 'global' : 'follow'

    const criteria =
        view === 'tag'
            ? SQL`WHERE id IN (SELECT post FROM post_tags WHERE tag = ${tag})`
            : view === 'global'
            ? SQL``
            : SQL`WHERE post.author IN (SELECT user FROM user_follow WHERE follower = ${user.id})`

    const NavLinkTabs: NavPages = {
        follow: user.id && ['/', 'Your Feed'],
        global: ['/?view=global', 'Global Feed'],
        tag: tag && [
            '/?tag=' + tag,
            <>
                <i className="ion-pound"></i> {tag}
            </>,
        ],
    }

    return (
        <div>
            <Header
                title={view === 'tag' ? `#${tag}` : view === 'global' ? 'Global Feed' : 'Your Feed'}
            />
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
                                <TabNavigation view={view} pages={NavLinkTabs} />
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
        </div>
    )
}
