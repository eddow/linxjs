import linq from '@linxjs/core'
import { memCollection } from './core'

export type PartialResult<T = any[]> = AsyncIterable<T, any, any>

export { memCollection }

export default linq(memCollection)
