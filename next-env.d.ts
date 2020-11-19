/// <reference types="next" />
/// <reference types="next/types/global" />

import { CSSProp } from 'styled-components'

declare module 'styled-components' {
    export interface DefaultTheme {}
}

// Add support for the `css` prop on all React components
declare module 'react' {
    interface Attributes {
        css?: CSSProp
    }
}
