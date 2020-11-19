import React from 'react'
import { css } from 'styled-components'
import { createGlobalStyle, ThemeProvider } from 'styled-components'
import Router from 'next/router'
import { createQuery, QueryContext } from '@client/query'
import NProgress from 'nprogress'
import 'nprogress/nprogress.css'
import { UserContext } from '@client/auth'

Router.events.on('routeChangeStart', () => NProgress.start())
Router.events.on('routeChangeComplete', () => NProgress.done())
Router.events.on('routeChangeError', () => NProgress.done())

const GlobalStyle = createGlobalStyle(css`
    * {
        box-sizing: border-box;
    }
    body {
        margin: 0;
        padding: 0;

        font-family: Avenir, sans-serif;
    }

    #nprogress .bar {
        background: #f25e5c;
    }
    #nprogress .peg {
        box-shadow: 0 0 10px #f25e5c, 0 0 5px #f25e5c;
    }
    #nprogress .spinner-icon {
        display: none;
    }
`)

const theme = {}

export default function MyApp({ Component, pageProps }) {
    const { tape, data, user, sql } = pageProps
    const query = createQuery(tape, data, false, defaultUncachedCallback)
    useScrollRestoration()

    return (
        <QueryContext.Provider value={query}>
            <UserContext.Provider value={user}>
                <GlobalStyle />
                <ThemeProvider theme={theme}>
                    <Component {...pageProps} />
                    <div
                        css={css`
                            max-width: 800px;
                            margin: 0 auto;
                            padding: 20px;
                            pre {
                                white-space: pre-wrap;
                            }
                            summary {
                                color: gray;
                            }
                        `}
                    >
                        <details>
                            <summary
                                onClick={() => {
                                    console.log(data)
                                }}
                            >
                                Show Generated SQL
                            </summary>
                            <pre>{sql}</pre>
                        </details>
                    </div>
                </ThemeProvider>
            </UserContext.Provider>
        </QueryContext.Provider>
    )
}

function useScrollRestoration() {
    React.useEffect(() => {
        if ('scrollRestoration' in window.history) {
            let cachedScrollPositions = []
            window.history.scrollRestoration = 'manual'
            let shouldScrollRestore

            Router.events.on('routeChangeStart', () => {
                cachedScrollPositions.push([window.scrollX, window.scrollY])
            })

            Router.events.on('routeChangeComplete', () => {
                if (shouldScrollRestore) {
                    const { x, y } = shouldScrollRestore
                    window.scrollTo(x, y)
                    shouldScrollRestore = false
                }
            })

            Router.beforePopState(() => {
                const [x, y] = cachedScrollPositions.pop()
                shouldScrollRestore = { x, y }

                return true
            })
        }
    }, [])
}

// Here we specify a uncached data callback so during development
// if a component is hot-reloaded with code that requires new
// data, we automatically execute a "soft refresh" (i.e. we call
// getServerSideProps again but without triggering a full browser
// refresh). We record the status with the "uncachedSoftReload"
// state variable, so that if this happens again without a sucessful
// "routeChangeComplete" event, we throw the error rather than
// enter some kind of refresh loop.

let uncachedSoftReload
function defaultUncachedCallback(err: Error, type: number) {
    if (uncachedSoftReload) throw err
    // eslint-disable-next-line no-console
    console.error(err)
    uncachedSoftReload = true
    Router.push(Router.asPath).then(
        success => {
            if (success) uncachedSoftReload = false
        },
        () => {
            // do nothing
        }
    )
    // Here we return something that matches the expected
    // Query interface, so that our subsequent code has the
    // greatest likelihood of successfully rendering before
    // the data is loaded
    const makeNOPQuery = () => {
        const q = () => null
        q.one = () => makeNOPQuery()
        q.many = () => []
        return q
    }
    if (type === 1) return makeNOPQuery()
    if (type === 2) return []
    return null
}
