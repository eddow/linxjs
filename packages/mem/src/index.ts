import linq from '@linxjs/core'
import { memCollector } from './core'

export type PartialResult<T = any[]> = AsyncIterable<T, any, any>

export { memCollector as memCollection, greedyCollector as greedyCollection } from './core'

export default linq(memCollector)
