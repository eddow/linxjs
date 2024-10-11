import type { LinqCollection } from './collection'
import { parse } from './parser'
import {
	BaseLinqEntry,
	Primitive,
	SemanticError,
	Transmissible,
	transmissibleFunction,
	TransmissibleFunction
} from './value'

export * from './parser'
export * from './transformations'
export * from './collection'
export * from './value'

const tfCache = new WeakMap<Transmissible<any>, TransmissibleFunction<any>>()
export function cachedTransmissibleFunction<R, T extends BaseLinqEntry[] = BaseLinqEntry[]>(
	transmissible: Transmissible<R, T>,
	availableParams: number = 0
): TransmissibleFunction<R, T> {
	let tf =
		transmissible instanceof TransmissibleFunction
			? transmissible
			: <TransmissibleFunction<R, T>>tfCache.get(transmissible)
	if (!tf) {
		tf = transmissibleFunction(transmissible, availableParams)
		tfCache.set(transmissible, <TransmissibleFunction<any>>tf)
	}
	return tf
}

export function constant<R>(transmissible: Transmissible<R>): R {
	const tf = cachedTransmissibleFunction(transmissible)
	if (!tf.constant) throw new Error(`Constant expected: ${tf.body}`)
	return tf.constant
}

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
