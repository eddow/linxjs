import { BaseLinqEntry, Collector, LinqCollection } from './internals'
import { parse } from './parser'

export * from './parser'
export * from './transformations'
export * from './internals'

export type Linq = <T extends BaseLinqEntry = BaseLinqEntry>(
	parts: TemplateStringsArray,
	...args: any[]
) => LinqCollection<T>

export default function linq(collector: Collector): Linq {
	return <T extends BaseLinqEntry>(parts: TemplateStringsArray, ...args: any[]) => {
		const { transformations, from, source } = parse(parts, ...args)
		let enumerable: LinqCollection<any> = collector(source).select((v) => [v]),
			variables: string[] = [from]
		for (const transformation of transformations) {
			enumerable = transformation.transform(enumerable, variables, collector)
			variables = transformation.newVariables(variables)
		}
		return enumerable.select<T>((v) => v[0])
	}
}
