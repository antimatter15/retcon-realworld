# RealWorld with Retcon

This is a full-stack implementation of [RealWorld](https://github.com/gothinkster/realworld).

This repository contains a feature-complete implementation of "Conduit", a social blogging
application similar to Medium.com. Rather than implementing the standard RealWorld REST API, this
implementation uses a novel approach to full-stack web application development called Retcon.

This is a demonstration for how web applications can be built and maintained with an order of
magnitude less code, less complexity, much better readability, and much better performance.

This project uses SQLite for data persistence, and NextJS for SSR, and is written in TypeScript.

## What is Retcon?

Retcon is a technique for building performant server-rendered web applications out of composable
fragments of inline SQL.

```jsx
function HomePage() {
    const query = useQuery()
    return (
        <div>
            {query.many`FROM post ORDER BY creation_date DESC`.map(post => {
                const author = post.one`FROM user WHERE id = post.author`
                return (
                    <div>
                        <h3>{post`title`}</h3>
                        {post`body`}
                        <br />
                        Posted: {post`creation_date`}, by {author`name`}
                    </div>
                )
            })}
        </div>
    )
}
```

Retcon uses server-side-rendering to determine all the data dependencies of the page, and then it
generates a single SQL query which can fetch all the required data. Hierarchical information is
resolved using JSON aggregation capabilities of modern SQL engines.

```sql
SELECT json_object(
    'a1', (SELECT json_group_array(json(a1)) FROM (SELECT json_object(
        'a2', (SELECT json_object(
            'a6', (SELECT name)
        ) AS a2 FROM user WHERE id = post.author),
        'a3', (SELECT title),
        'a4', (SELECT body),
        'a5', (SELECT creation_date)
    ) AS a1 FROM post ORDER BY creation_date DESC))
) AS data
```

## What's the story behind the name?

The name is a reference to "retroactive continuity", a literary device often used in sequels to
adjust "facts" in the plot of previous works. This is akin to how the Retcon technique iteratively
performs dry renders and adjusts the loaded data. While the literary "retcon" may be used in a
sequel, the Retcon technique is used with a SQL.

Retcon is also a backronym for "returned continuation", as the query objects used in Retcon can be
thought of as "continuations" found in languages such as LISP that capture a certain lexical scope
and control state.

And finally, it's a bit "retro", and reminiscent of old-school PHP applications that interleaved
data fetching and rendering logic. But this new incarnation sheds the warts associated with SQL
injection, poor performance from multiple database roundtrips, while allowing seamless integration
with modern frontend components.
