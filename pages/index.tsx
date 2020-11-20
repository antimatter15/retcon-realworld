import { useQuery } from '@client/query'
import makeServerProps from '@server/query'
import React from 'react'
import { css } from 'styled-components'
import Link from 'next/link'
import { useUser } from '@client/auth'

export const getServerSideProps = makeServerProps(App)

export default function App() {
    const query = useQuery()
    const user = useUser()
    return (
        <div
            css={css`
                max-width: 800px;
                margin: 0 auto;
            `}
        >
            Hello {query`CURRENT_TIMESTAMP`} and {user.id}
            <UserProfile user={query.one`FROM user WHERE user.id = ${user.id}`} />
        </div>
    )
}

function UserProfile({ user }) {
    return (
        <fieldset>
            <legend>User Profile</legend>
            <img
                src={user`picture`}
                css={css`
                    border-radius: 300px;
                    width: 100px;
                    height: 100px;
                `}
            />
            Name: {user`name`}
            <br />
        </fieldset>
    )
}
