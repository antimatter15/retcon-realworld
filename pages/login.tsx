import { useQuery } from '@client/query'
import makeServerProps from '@server/query'
import React from 'react'
import Link from 'next/link'
import { useUser } from '@client/auth'
import { Header } from '@components/RealWorld'
import RPC from '@client/rpc'
import { useRouter } from 'next/router'

export const getServerSideProps = makeServerProps(App)

export default function App() {
    const query = useQuery()
    const router = useRouter()
    const [error, setError] = React.useState(null)
    return (
        <div>
            <Header title="Login" />
            <div className="auth-page">
                <div className="container page">
                    <div className="row">
                        <div className="col-md-6 offset-md-3 col-xs-12">
                            <h1 className="text-xs-center">Sign In</h1>
                            <p className="text-xs-center">
                                <Link href="/register">
                                    <a>Need an account?</a>
                                </Link>
                            </p>
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
                                        await RPC.PUBLIC_login(
                                            form.email.value,
                                            form.password.value
                                        )
                                        router.push('/')
                                    } catch (err) {
                                        console.error(err)
                                        setError(err.message)
                                    }
                                }}
                            >
                                <fieldset>
                                    <fieldset className="form-group">
                                        <input
                                            type="email"
                                            name="email"
                                            className="form-control form-control-lg"
                                            placeholder="Email"
                                        />
                                    </fieldset>
                                    <fieldset className="form-group">
                                        <input
                                            type="password"
                                            name="password"
                                            className="form-control form-control-lg"
                                            placeholder="Password"
                                        />
                                    </fieldset>
                                    <button
                                        className="btn btn-lg btn-primary pull-xs-right"
                                        type="submit"
                                    >
                                        Sign in
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
