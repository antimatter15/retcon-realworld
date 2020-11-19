import Router from 'next/router'

function makeClient(client): any {
    function makeLayer(path) {
        return new Proxy(
            function () {
                return client(path, Array.from(arguments))
            },
            {
                get(obj, name) {
                    return makeLayer(path.concat([name]))
                },
            }
        )
    }
    return makeLayer([])
}

export function refresh() {
    Router.replace(Router.asPath)
}

async function RPCClient(path, args) {
    let res = await fetch('/api/rpc', {
        body: JSON.stringify({
            path: path,
            args: args,
        }),
        method: 'POST',
        credentials: 'include',
    })
    const text = await res.text()
    try {
        return JSON.parse(text)
    } catch (err) {
        throw new Error(text)
    }
}
export const RPCRefresh: typeof import('../server/api') = makeClient(async (path, args) => {
    let result = await RPCClient(path, args)
    refresh()
    return result
})

const RPC: typeof import('../server/api') = makeClient(RPCClient)

export default RPC
