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
        background: #5cb85c;
    }
    #nprogress .peg {
        box-shadow: 0 0 10px #5cb85c, 0 0 5px #5cb85c;
    }
    #nprogress .spinner-icon {
        display: none;
    }
`)

const theme = {}

export default function MyApp({ Component, pageProps }) {
    const { tape, data, user, debug } = pageProps
    const query = createQuery(tape, data, false, defaultUncachedCallback)
    useScrollRestoration()

    return (
        <QueryContext.Provider value={query}>
            <UserContext.Provider value={user}>
                <GlobalStyle />
                <ThemeProvider theme={theme}>
                    <link rel="stylesheet" href="//demo.productionready.io/main.css"></link>
                    <link
                        rel="stylesheet"
                        href="//code.ionicframework.com/ionicons/2.0.1/css/ionicons.min.css"
                    ></link>
                    <link
                        rel="stylesheet"
                        href="//fonts.googleapis.com/css?family=Titillium+Web:700|Source+Serif+Pro:400,700|Merriweather+Sans:400,700|Source+Sans+Pro:400,300,600,700,300italic,400italic,600italic,700italic"
                    ></link>
                    <Component {...pageProps} />
                    <ShowDebug debug={debug} tape={tape} data={data} />
                </ThemeProvider>
            </UserContext.Provider>
        </QueryContext.Provider>
    )
}

function ShowDebug({ debug, tape, data }) {
    const [show, setShow] = React.useState(false)
    return (
        <>
            {show && (
                <div
                    css={css`
                        position: fixed;
                        right: 0;
                        top: 0;
                        bottom: 0;
                        left: 200px;
                        background: rgba(255, 255, 255, 0.7);
                        backdrop-filter: blur(5px);
                        /* background: white; */
                        padding: 20px;
                        z-index: 10;
                        overflow-y: scroll;
                        box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);
                        pre {
                            white-space: pre-wrap;
                        }
                    `}
                >
                    <h1>Debug View</h1>
                    <p>
                        Page resolved with {debug.queries.length} queries in {debug.time}ms.
                        Resulting data is {JSON.stringify(data).length} bytes.
                    </p>
                    {debug.queries.map((query, i) => (
                        <pre key={i}>{query}</pre>
                    ))}
                    <hr />
                    <h3>Data</h3>
                    <pre>{JSON.stringify(data)}</pre>
                    <hr />
                    <h3>Tape</h3>
                    <pre>{JSON.stringify(tape)}</pre>
                </div>
            )}
            <div
                onClick={() => {
                    setShow(k => !k)
                    if (!show) console.log(data)
                }}
                css={css`
                    z-index: 10;
                    position: fixed;
                    bottom: 20px;
                    left: 20px;
                    background: gray;
                    padding: 5px 10px;
                    border-radius: 10px;
                    color: white;
                    cursor: pointer;
                    user-select: none;
                    .unit {
                        opacity: 0.5;
                    }
                `}
            >
                {debug.time}
                <span className="unit">ms</span>
            </div>
        </>
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
                const pos = cachedScrollPositions.pop()
                if (pos) shouldScrollRestore = { x: pos[0], y: pos[1] }
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

let uncachedSoftReload: number
function defaultUncachedCallback(err: Error, type: number) {
    if (uncachedSoftReload === 2) throw err
    if (!uncachedSoftReload) {
        // eslint-disable-next-line no-console
        console.error(err)
        uncachedSoftReload = 1

        const routeChangeStartHandler = () => {
            uncachedSoftReload = 2
            Router.events.off('routeChangeStart', routeChangeStartHandler)
        }
        Router.events.on('routeChangeStart', routeChangeStartHandler)
        Router.push(Router.asPath).then(
            success => {
                if (success) uncachedSoftReload = 0
            },
            () => {
                // do nothing
            }
        )
    }
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
