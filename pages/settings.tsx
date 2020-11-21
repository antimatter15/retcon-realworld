import { useQuery } from '@client/query'
import makeServerProps from '@server/query'
import React from 'react'
import Link from 'next/link'
import { css } from 'styled-components'
import { useUser } from '@client/auth'
import { Header } from '@components/RealWorld'
import RPC, { refresh } from '@client/rpc'
import { useRouter } from 'next/router'

export const getServerSideProps = makeServerProps(App)

export default function App() {
    const query = useQuery()
    const router = useRouter()
    const user = useUser()

    const [error, setError] = React.useState(null)
    const userObject = query.one`FROM user WHERE id = ${user.id}`
    return (
        <div>
            <Header title="Settings" />
            <div className="settings-page">
                <div className="container page">
                    <div className="row">
                        <div className="col-md-6 offset-md-3 col-xs-12">
                            <h1 className="text-xs-center">Your Settings</h1>
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
                                        await RPC.updateSettings(
                                            form.picture.vlaue,
                                            form.username.value,
                                            form.bio.value,
                                            form.email.value,
                                            form.password.value
                                        )
                                        refresh()
                                    } catch (err) {
                                        console.error(err)
                                        setError(err.message)
                                    }
                                }}
                            >
                                <fieldset>
                                    <fieldset className="form-group">
                                        <input
                                            defaultValue={userObject`picture`}
                                            name="picture"
                                            type="text"
                                            className="form-control"
                                            placeholder="URL of profile picture"
                                        />
                                    </fieldset>
                                    <fieldset className="form-group">
                                        <input
                                            type="text"
                                            name="username"
                                            defaultValue={userObject`name`}
                                            className="form-control form-control-lg"
                                            placeholder="Username"
                                        />
                                    </fieldset>
                                    <fieldset className="form-group">
                                        <textarea
                                            className="form-control form-control-lg"
                                            name="bio"
                                            defaultValue={userObject`bio`}
                                            rows={8}
                                            placeholder="Short bio about you"
                                        ></textarea>
                                    </fieldset>
                                    <fieldset className="form-group">
                                        <input
                                            type="email"
                                            name="email"
                                            defaultValue={userObject`email`}
                                            className="form-control form-control-lg"
                                            placeholder="Email"
                                        />
                                    </fieldset>
                                    <fieldset className="form-group">
                                        <input
                                            type="password"
                                            name="password"
                                            className="form-control form-control-lg"
                                            placeholder="New Password"
                                        />
                                    </fieldset>
                                    <button
                                        className="btn btn-lg btn-primary pull-xs-right"
                                        type="submit"
                                    >
                                        Update Settings
                                    </button>
                                </fieldset>
                            </form>
                            <hr />
                            <button
                                className="btn btn-outline-danger"
                                onClick={async e => {
                                    await RPC.PUBLIC_logout()
                                    router.push('/')
                                }}
                            >
                                Or click here to logout.
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
