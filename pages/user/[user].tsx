import { SQL, useQuery } from '@client/query'
import makeServerProps from '@server/query'
import React from 'react'
import {
    ArticlePreview,
    FollowButton,
    Header,
    NavPages,
    PostList,
    TabNavigation,
} from '@components/RealWorld'
import { useRouter } from 'next/router'

export const getServerSideProps = makeServerProps(App)

export default function App() {
    const query = useQuery()
    const router = useRouter()
    const userId = router.query.user
    const user = query.one`FROM user WHERE id = ${userId}`
    const view = router.query.view === 'favorite' ? 'favorite' : 'author'

    const criteria =
        view === 'favorite'
            ? SQL`WHERE id IN (SELECT post FROM post_favorite WHERE user = ${userId})`
            : SQL`WHERE author = ${userId}`

    const TabPages: NavPages = {
        author: ['/user/' + userId, 'My Articles'],
        favorite: [`/user/${userId}?view=favorite`, 'Favorited Articles'],
    }

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
                                <TabNavigation view={view} pages={TabPages} />
                            </div>
                            <PostList criteria={criteria} />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
