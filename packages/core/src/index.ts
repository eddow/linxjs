import { LinqCollection } from './internals'
import { parse } from './parser'
import { Transformation } from './transformations'

export * from './parser'
export * from './transformations'
export * from './internals'

export type Linq<T = any> = (parts: TemplateStringsArray, ...args: any[]) => LinqCollection<T>

export default function linq<T = any>(doer: (p: Transformation[]) => LinqCollection<T>): Linq<T> {
	return (parts: TemplateStringsArray, ...args: any[]) => {
		const parsed = parse(parts, ...args)
		return doer(parsed)
	}
}
