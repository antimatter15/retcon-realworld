import React from 'react'

export function ShowDebug({ debug, tape, data }) {
    const [show, setShow] = React.useState(false)
    return (
        <>
            {show && (
                <div className="debug-panel">
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
                className="debug-button"
                onClick={() => {
                    setShow(k => !k)
                    if (!show) console.log(data)
                }}
            >
                {debug.time}
                <span className="unit">ms</span>
            </div>
        </>
    )
}
