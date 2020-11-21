import { useQuery } from '@client/query'
import makeServerProps from '@server/query'
import React from 'react'
import Link from 'next/link'
import { css } from 'styled-components'
import { useUser } from '@client/auth'
import { FavoriteButton, FollowButton, Header } from '@components/RealWorld'
import { useRouter } from 'next/router'
import RPC, { RPCRefresh } from '@client/rpc'
import marked from 'marked'

export const getServerSideProps = makeServerProps(App)

function ArticleMeta({ article }) {
    const author = article.one`FROM user WHERE id = post.author`
    const user = useUser()
    const router = useRouter()
    return (
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
                <span className="date">{article`creation_date`}</span>
            </div>
            {!user.id ? null : article`author` + '' === user.id + '' ? (
                <span>
                    <Link href={'/editor/' + article`id`}>
                        <a className="btn btn-outline-secondary btn-sm">
                            <i className="ion-edit"></i> Edit Article
                        </a>
                    </Link>{' '}
                    <button
                        className="btn btn-outline-danger btn-sm"
                        onClick={async e => {
                            if (!confirm('Are you sure you want to delete this post?')) return
                            await RPC.deletePost(article`id`)
                            router.push('/')
                        }}
                    >
                        <i className="ion-trash-a"></i> Delete Article
                    </button>
                </span>
            ) : (
                <>
                    <FollowButton user={article.one`FROM user WHERE id = author`} />{' '}
                    <FavoriteButton post={article} />
                </>
            )}
        </div>
    )
}
export default function App() {
    const query = useQuery()
    const router = useRouter()
    const article = query.one`FROM post WHERE id = ${router.query.article}`

    const markup = { __html: marked(article`body` || '', { sanitize: true }) }

    return (
        <div>
            <Header />
            <div className="article-page">
                <div className="banner">
                    <div className="container">
                        <h1>{article`title`}</h1>
                        <ArticleMeta article={article} />
                    </div>
                </div>
                <div className="container page">
                    <div className="row article-content">
                        <div className="col-xs-12">
                            <div dangerouslySetInnerHTML={markup}></div>
                            <br />
                            <ul className="tag-list">
                                {article.many`FROM post_tags WHERE post = post.id`.map(tag => (
                                    <li className="tag-default tag-pill tag-outline" key={tag`id`}>
                                        <Link href={'/?tag=' + tag`tag`}>
                                            <a>{tag`tag`} </a>
                                        </Link>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    </div>

                    <hr />
                    <div className="article-actions">
                        <ArticleMeta article={article} />
                    </div>
                    <CommentBlock post={article} />
                </div>
            </div>
        </div>
    )
}

function CommentBlock({ post }) {
    const user = useUser()
    const query = useQuery()
    const currentUser = query.one`FROM user WHERE id = ${user.id}`
    const postId = post`id`

    return (
        <div className="row">
            <div className="col-xs-12 col-md-8 offset-md-2">
                <div>
                    {user.id ? (
                        <form
                            className="card comment-form"
                            onSubmit={async e => {
                                e.preventDefault()

                                const form = e.target as any
                                await RPCRefresh.addComment(postId, form.message.value)
                                form.message.value = ''
                            }}
                        >
                            <div className="card-block">
                                <textarea
                                    name="message"
                                    className="form-control"
                                    placeholder="Write a comment..."
                                    rows={3}
                                ></textarea>
                            </div>
                            <div className="card-footer">
                                <img
                                    className="comment-author-img"
                                    src={
                                        currentUser`picture` ||
                                        'https://static.productionready.io/images/smiley-cyrus.jpg'
                                    }
                                />
                                <button className="btn btn-sm btn-primary" type="submit">
                                    Post Comment
                                </button>
                            </div>
                        </form>
                    ) : (
                        <p>
                            <Link href="/login">
                                <a>Sign in</a>
                            </Link>
                            &nbsp;or&nbsp;
                            <Link href="/register">
                                <a>sign up</a>
                            </Link>
                            &nbsp;to add comments on this article.
                        </p>
                    )}
                </div>
                <div>
                    {post.many`FROM post_comment WHERE post = post.id`.map(comment => {
                        const author = comment.one`FROM user WHERE id = post.author`

                        return (
                            <div className="card" key={comment`id`}>
                                <div className="card-block">
                                    <p className="card-text">{comment`message`}</p>
                                </div>
                                <div className="card-footer">
                                    <Link href={'/user/' + author`id`}>
                                        <a className="comment-author">
                                            <img
                                                src={
                                                    author`picture` ||
                                                    'https://static.productionready.io/images/smiley-cyrus.jpg'
                                                }
                                                className="comment-author-img"
                                            />
                                        </a>
                                    </Link>{' '}
                                    <Link href={'/user/' + author`id`}>
                                        <a className="comment-author">{author`name`}</a>
                                    </Link>
                                    <span className="date-posted">{comment`creation_date`}</span>
                                    <span className="mod-options">
                                        {author`id` + '' === user.id + '' && (
                                            <i
                                                className="ion-trash-a"
                                                onClick={e => {
                                                    RPCRefresh.deleteComment(comment`id`)
                                                }}
                                            ></i>
                                        )}
                                    </span>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </div>
    )
}
