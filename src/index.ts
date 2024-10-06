import { parse, type Parsed } from './parser'
import memLinq from './memLinq'
export { memLinq }
export * from './parser'
export * from './transformations'

export default function linq<T = any>(doer: (p: Parsed) => T) {
	return (parts: TemplateStringsArray, ...args: any[]) => {
		const parsed = parse(parts, ...args)
		return doer(parsed)
	}
}
