import {
	Primitive,
	SemanticError,
	BaseLinqEntry,
	TransmissibleFunction,
	Transmissible,
	InlineValue,
	cachedTransmissibleFunction,
	linxArgName,
	analyzeLambda,
	functional
} from '@linxjs/core'
export function concatResultSelector<
	T extends BaseLinqEntry,
	O extends BaseLinqEntry,
	R extends BaseLinqEntry
>(resultSelector: Transmissible<R, [T, O]> | string): (e: T, o: O) => Promise<R> {
	return typeof resultSelector === 'string'
		? (e: T, o: O) =>
				Promise.resolve(<R>{
					...(<MemCollectionEntry>e),
					[resultSelector]: o
				})
		: functional(resultSelector)
}

export type MemCollectionEntry = Record<string, any>

export async function comparablePair<T>(
	v: T,
	comparable?: (item: T) => Promise<Primitive>
): Promise<[T, Primitive]> {
	const c: Primitive = comparable ? await comparable(v) : <Primitive>v
	if (!['number', 'string', 'boolean'].includes(typeof c))
		throw new SemanticError("Can't sum non-numeric values")
	return [v, c]
}
