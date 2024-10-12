import type { LinqCollection } from './collection'
import { parse } from './parser'
import { BaseLinqEntry } from './value'

export * from './parser'
export * from './transformations'
export * from './collection'
export * from './value'

export default function linq<T extends BaseLinqEntry = BaseLinqEntry>(
	parts: TemplateStringsArray,
	...args: any[]
): LinqCollection<T> {
	const { transformations, from, source } = parse(parts, ...args)
	let enumerable: LinqCollection<any> = source.wrap(from),
		variables: string[] = [from]
	for (const transformation of transformations) {
		enumerable = transformation.transform(enumerable)
		variables = transformation.newVariables(variables)
	}
	return enumerable.unwrap()
}
