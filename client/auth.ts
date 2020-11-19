import React from 'react'

export type User = {
    id: number
}

export const UserContext = React.createContext<User>(null)

export function useUser() {
    return React.useContext(UserContext)
}
