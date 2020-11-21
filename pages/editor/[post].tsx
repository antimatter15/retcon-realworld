import { useQuery } from '@client/query'
import makeServerProps from '@server/query'
import React from 'react'
import Link from 'next/link'
import { css } from 'styled-components'
import { useUser } from '@client/auth'
import { Header } from '@components/RealWorld'
import { useRouter } from 'next/router'
import RPC, { refresh } from '@client/rpc'

export const getServerSideProps = makeServerProps(App)

export default function App() {
    const query = useQuery()

    const router = useRouter()
    const page = query.one`FROM post WHERE id = ${router.query.post}`
    const [tags, setTags] = React.useState(
        page.many`FROM post_tags WHERE post = post.id`.map(tag => tag`tag`)
    )
    const [error, setError] = React.useState(null)

    return (
        <div>
            <Header />
            <div className="editor-page">
                <div className="container page">
                    <div className="row">
                        <div className="col-md-10 offset-md-1 col-xs-12">
                            {error && (
                                <ul className="error-messages">
                                    <li>{error}</li>
                                </ul>
                            )}
                            <form
                                onSubmit={async e => {
                                    e.preventDefault()
                                    const form = e.target as any
                                    try {
                                        setError(null)
                                        let postId = await RPC.updatePost(
                                            router.query.post,
                                            form.title.value,
                                            form.description.value,
                                            form.body.value,
                                            tags
                                        )
                                        router.push('/article/' + postId)
                                    } catch (err) {
                                        setError(err.message)
                                        console.error(err)
                                    }
                                }}
                            >
                                <fieldset>
                                    <fieldset className="form-group">
                                        <input
                                            type="text"
                                            name="title"
                                            defaultValue={page`title` || ''}
                                            className="form-control form-control-lg"
                                            placeholder="Article Title"
                                        />
                                    </fieldset>
                                    <fieldset className="form-group">
                                        <input
                                            type="text"
                                            className="form-control"
                                            defaultValue={page`description` || ''}
                                            name="description"
                                            placeholder="What's this article about?"
                                        />
                                    </fieldset>
                                    <fieldset className="form-group">
                                        <textarea
                                            className="form-control"
                                            rows={8}
                                            defaultValue={page`body` || ''}
                                            name="body"
                                            placeholder="Write your article (in markdown)"
                                        ></textarea>
                                    </fieldset>
                                    <fieldset className="form-group">
                                        <input
                                            type="text"
                                            name="tags"
                                            className="form-control"
                                            placeholder="Enter tags"
                                            onKeyDown={e => {
                                                if (
                                                    e.key === 'Enter' ||
                                                    e.key === ',' ||
                                                    e.key === ';'
                                                ) {
                                                    e.preventDefault()
                                                    let input = e.target as any
                                                    setTags([...tags, input.value])
                                                    input.value = ''
                                                }
                                            }}
                                        />
                                        <div className="tag-list">
                                            {tags.map(tag => (
                                                <span className="tag-default tag-pill" key={tag}>
                                                    <i
                                                        className="ion-close-round"
                                                        onClick={e =>
                                                            setTags(tags =>
                                                                tags.filter(k => k !== tag)
                                                            )
                                                        }
                                                    ></i>
                                                    {tag}
                                                </span>
                                            ))}
                                        </div>
                                    </fieldset>
                                    <button
                                        className="btn btn-lg pull-xs-right btn-primary"
                                        type="submit"
                                    >
                                        Publish Article
                                    </button>
                                </fieldset>
                            </form>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
