import {
	Comparable,
	LinqCollection,
	Numeric,
	Primitive,
	SemanticError,
	BaseLinqEntry,
	Group,
	keyedGroup,
	Predicate,
	PromisedIterable,
	Transmissible,
	List,
	BaseLinqQSEntry,
	OrderSpec,
	constant,
	unwrap,
	toArray,
	functional,
	promised
} from '@linxjs/core'
import { comparablePair, concatResultSelector, MemCollectionEntry } from './helpers'

function id<T extends BaseLinqEntry, R extends BaseLinqEntry>(v: T): Promise<R> {
	return Promise.resolve(<R>(<unknown>v))
}

//#region generic
function join<T extends BaseLinqEntry, I extends BaseLinqEntry, R extends BaseLinqEntry>(
	outer: AsyncIterable<T>,
	inner: AsyncIterable<I>,
	outerKeySelector: Comparable<T>,
	innerKeySelector: Comparable<I>,
	resultSelector: (outer: T, inner: I[]) => AsyncIterable<R>,
	innerVariable?: string
): MemCollection<R> {
	const fOuterKS = functional(outerKeySelector),
		fInnerKS = functional(innerKeySelector)
	function innerWrap(innerCollection: LinqCollection) {
		return <LinqCollection<I>>(
			(innerVariable ? innerCollection.wrap(innerVariable) : innerCollection)
		)
	}
	function innerUnwrap(innerEntries: I[]) {
		return innerVariable
			? innerEntries.map((i) => (<MemCollectionEntry>i)[innerVariable])
			: innerEntries
	}
	return new MemCollection({
		async *[Symbol.asyncIterator](): AsyncIterableIterator<R> {
			const outerIterator = memCollection(outer)
					.order({ by: outerKeySelector, way: 'asc' })
					[Symbol.asyncIterator](),
				innerIterator = innerWrap(memCollection(constant(inner)))
					.order({ by: innerKeySelector, way: 'asc' })
					[Symbol.asyncIterator]()
			let [outerIteratorResult, innerIteratorResult] = await Promise.all([
				outerIterator.next(),
				innerIterator.next()
			])
			if (outerIteratorResult.done) return
			if (!innerIteratorResult.done) {
				let [outerKey, innerKey] = await Promise.all([
					fOuterKS(outerIteratorResult.value),
					fInnerKS(innerIteratorResult.value)
				])
				do {
					if (outerKey < innerKey) {
						yield* resultSelector(outerIteratorResult.value, [])
						outerIteratorResult = await outerIterator.next()
						if (!outerIteratorResult.done) outerKey = await fOuterKS(outerIteratorResult.value)
					} else if (outerKey > innerKey) {
						innerIteratorResult = await innerIterator.next()
						if (!innerIteratorResult.done) innerKey = await fInnerKS(innerIteratorResult.value)
					} else {
						const key = outerKey,
							outerEntries = [],
							innerEntries = []
						do {
							outerEntries.push(outerIteratorResult.value)
							outerIteratorResult = await outerIterator.next()
							if (!outerIteratorResult.done) outerKey = await fOuterKS(outerIteratorResult.value)
						} while (!outerIteratorResult.done && outerKey === key)
						do {
							innerEntries.push(innerIteratorResult.value)
							innerIteratorResult = await innerIterator.next()
							if (!innerIteratorResult.done) innerKey = await fInnerKS(innerIteratorResult.value)
						} while (!innerIteratorResult.done && innerKey === key)
						for (const o of outerEntries) yield* resultSelector(o, innerUnwrap(innerEntries))
					}
				} while (!outerIteratorResult.done && !innerIteratorResult.done)
			}
			while (!outerIteratorResult.done) {
				yield* resultSelector(outerIteratorResult.value, [])
				outerIteratorResult = await outerIterator.next()
			}
		}
	})
}
//#endregion

/**
 * Converts an iterable to a {@link LinqCollection} if it's not already one.
 * Server-first collector: if a source from a query is given and is more specified in the linq query,
 * the specifications will be added to the already existing collection and sent as a request
 * @param {AsyncIterable<T>} enumerable The iterable to convert.
 * @returns {LinqCollection<T>} The converted collection.
 */
export default function memCollection<T extends BaseLinqEntry>(
	enumerable: AsyncIterable<T> | Iterable<T>
): MemCollection<T> {
	return enumerable instanceof MemCollection ? enumerable : new MemCollection(enumerable)
}

/**
 * Converts an iterable to a {@link LinqCollection} if it's not already one.
 * Client-first collector: if a source from a query is given and is more specified in the linq query,
 * the specifications will be executed in the client's memory by default
 * @param {AsyncIterable<T>} enumerable The iterable to convert.
 * @returns {LinqCollection<T>} The converted collection.
 */
export function greedyCollector<T extends BaseLinqEntry>(
	enumerable: AsyncIterable<T>
): MemCollection<T> {
	return enumerable instanceof MemCollection ? enumerable : new MemCollection(enumerable)
}

export class MemCollection<T extends BaseLinqEntry = BaseLinqEntry> extends LinqCollection<T> {
	private enumerable: AsyncIterable<T>
	private get length(): number | undefined {
		return (<any>this.original).length
	}

	constructor(private original: AsyncIterable<T> | Iterable<T>) {
		super()
		if ((<AsyncIterable<T>>original)[Symbol.asyncIterator])
			this.enumerable = <AsyncIterable<T>>original
		else if ((<Iterable<T>>original)[Symbol.iterator])
			this.enumerable = new PromisedIterable(<Iterable<T>>original)
		else throw new SemanticError(`Can't create MemCollection from non-iterable: ${original}`)
	}
	[Symbol.asyncIterator](): AsyncIterator<T> {
		return this.enumerable[Symbol.asyncIterator]()
	}
	async toArray(): Promise<T[]> {
		return toArray(this.enumerable)
	}

	//#region aggregate

	async count(comparable?: Comparable<T>): Promise<number> {
		if (this.length !== undefined && !comparable) return this.length
		let rv = 0
		const enumerable = comparable
			? (<MemCollection<T>>this.distinctBy(comparable)).enumerable
			: this.enumerable
		for await (const v of enumerable) rv++
		return Promise.resolve(rv)
	}

	async sum(numeric?: Numeric<T>): Promise<number> {
		let rv = 0
		for await (const v of this.enumerable) {
			const n = numeric ? functional(numeric)(v) : v
			if (typeof n !== 'number') throw new SemanticError("Can't sum non-numeric values")
			rv += n
		}
		return rv
	}
	async average(numeric?: Numeric<T>): Promise<number> {
		let sum = 0,
			count = 0
		for await (const v of this.enumerable) {
			const n = numeric ? functional(numeric)(v) : v
			if (typeof n !== 'number') throw new SemanticError("Can't sum non-numeric values")
			sum += n
			count++
		}
		return count ? sum / count : NaN
	}
	async min(comparable?: Comparable<T>): Promise<T> {
		let rv: [T, Primitive]
		for await (const v of this.enumerable) {
			const tv = await comparablePair(v, functional(comparable))
			if (rv === undefined) rv = await comparablePair(v, functional(comparable))
			else if (tv[1] < rv[1]) rv = tv
		}
		return rv[0]
	}
	async max(comparable?: Comparable<T>): Promise<T> {
		const fComparable = functional(comparable)
		let rv: [T, Primitive]
		for await (const v of this.enumerable) {
			const tv = await comparablePair(v, fComparable)
			if (rv === undefined) rv = await comparablePair(v, fComparable)
			else if (tv[1] > rv[1]) rv = tv
		}
		return rv[0]
	}
	async aggregate<R>(seed: R, reducer: Transmissible<R, [R, T]>): Promise<R> {
		const functions = { reducer: functional(reducer) }
		let rv = seed
		for await (const v of this.enumerable) rv = await functions.reducer(rv, v)
		return rv
	}

	async all(predicate: Predicate<T>): Promise<boolean> {
		const functions = { predicate: functional(predicate) }
		for await (const v of this.enumerable) if (!(await functions.predicate(v))) return false
		return true
	}
	async any(predicate?: Predicate<T>): Promise<boolean> {
		const functions = { predicate: functional(predicate) }
		for await (const v of this.enumerable)
			if (!promised || (await functions.predicate(v))) return true
		return false
	}

	//#endregion
	//#region singletons

	async contains(item: T): Promise<boolean> {
		for await (const v of this.enumerable) if (v === item) return true
		return false
	}

	async first(predicate?: (item: T) => boolean): Promise<T> {
		for await (const v of this.enumerable) if (!predicate || predicate(v)) return v
		throw new SemanticError('Empty collection')
	}
	async firstOrDefault(predicate?: (item: T) => boolean, defaultValue: T = null): Promise<T> {
		for await (const v of this.enumerable) if (!predicate || predicate(v)) return v
		return defaultValue
	}
	async last(predicate?: Predicate<T>): Promise<T> {
		const functions = { predicate: functional(predicate) }
		let rv: T
		for await (const v of this.enumerable) if (!predicate || (await functions.predicate(v))) rv = v
		if (rv === undefined) throw new SemanticError('Empty collection')
		return rv
	}
	async lastOrDefault(predicate?: (item: T) => boolean, defaultValue: T = null): Promise<T> {
		let rv: T
		for await (const v of this.enumerable) if (!predicate || predicate(v)) rv = v
		return rv === undefined ? defaultValue : rv
	}
	async single(predicate?: (item: T) => boolean): Promise<T> {
		let found = false,
			rv: T
		for await (const v of this.enumerable) {
			if (predicate && !predicate(v)) continue
			if (found) throw new SemanticError('Collection contains multiple elements')
			found = true
			rv = v
		}
		if (!found) throw new SemanticError('Empty collection')
		return rv
	}
	async singleOrDefault(predicate?: (item: T) => boolean, defaultValue: T = null): Promise<T> {
		let found = false,
			rv: T
		for await (const v of this.enumerable) {
			if (predicate && !predicate(v)) continue
			if (found) throw new SemanticError('Collection contains multiple elements')
			found = true
			rv = v
		}
		return found ? rv : defaultValue
	}

	//#endregion
	//#region pagination

	take(n: number): MemCollection<T> {
		const { enumerable } = this
		return new MemCollection({
			async *[Symbol.asyncIterator](): AsyncIterableIterator<T> {
				let i = 0
				for await (const v of enumerable) {
					if (i++ >= n) break
					yield <T>v
				}
			}
		})
	}
	takeWhile(predicate: (item: T) => boolean): MemCollection<T> {
		const { enumerable } = this
		return new MemCollection({
			async *[Symbol.asyncIterator](): AsyncIterableIterator<T> {
				for await (const v of enumerable) {
					if (!predicate(v)) break
					yield <T>v
				}
			}
		})
	}
	takeLast(n: number): MemCollection<T> {
		return new MemCollection({
			async *[Symbol.asyncIterator](): AsyncIterableIterator<T> {
				const rv = []
				for await (const v of this.enumerable) {
					rv.push(v)
					if (rv.length >= n) rv.shift()
				}
				yield* rv
			}
		})
	}
	takeLastWhile(predicate: (item: T) => boolean): MemCollection<T> {
		return new MemCollection({
			async *[Symbol.asyncIterator](): AsyncIterableIterator<T> {
				let rv = []
				for await (const v of this.enumerable) {
					if (!predicate(v)) rv = []
					else rv.push(v)
				}
				yield* rv
			}
		})
	}

	skip(n: number): MemCollection<T> {
		const { enumerable } = this
		return new MemCollection({
			async *[Symbol.asyncIterator](): AsyncIterableIterator<T> {
				let i = 0
				for await (const v of enumerable) if (i++ >= n) yield v
			}
		})
	}

	skipWhile(predicate: (item: T) => boolean): MemCollection<T> {
		const { enumerable } = this
		return new MemCollection({
			async *[Symbol.asyncIterator](): AsyncIterableIterator<T> {
				let emitting = false
				for await (const v of enumerable) {
					if (!emitting && !predicate(v)) emitting = true
					if (emitting) yield v
				}
			}
		})
	}

	//#endregion
	//#region set operations

	defaultIfEmpty(defaultValue: T = null): MemCollection<T> {
		const { enumerable } = this
		return new MemCollection({
			async *[Symbol.asyncIterator](): AsyncIterableIterator<T> {
				let exists = false
				for await (const v of enumerable) {
					exists = true
					yield v
				}
				if (!exists) yield defaultValue
			}
		})
	}
	distinct(comparer?: (itemA: T, itemB: T) => boolean): MemCollection<T> {
		if (comparer) throw new Error('Memory `distinct` does not support `comparer`')
		const { enumerable } = this
		return new MemCollection({
			async *[Symbol.asyncIterator](): AsyncIterableIterator<T> {
				const seen = new Set()
				for await (const v of enumerable) {
					if (!seen.has(v)) {
						seen.add(v)
						yield v
					}
				}
			}
		})
	}

	distinctBy(by: Comparable<T>): MemCollection<T> {
		const { enumerable } = this,
			functions = { by: functional(by) }
		return new MemCollection({
			async *[Symbol.asyncIterator](): AsyncIterableIterator<T> {
				const seen = new Set<Primitive>()
				for await (const v of enumerable) {
					const key = await functions.by(v)
					if (!seen.has(key)) {
						seen.add(key)
						yield v
					}
				}
			}
		})
	}

	append(...items: T[]): MemCollection<T> {
		const { enumerable } = this
		return new MemCollection({
			async *[Symbol.asyncIterator](): AsyncIterableIterator<T> {
				yield* enumerable
				yield* items
			}
		})
	}
	prepend(...items: T[]): MemCollection<T> {
		const { enumerable } = this
		return new MemCollection({
			async *[Symbol.asyncIterator](): AsyncIterableIterator<T> {
				yield* items
				yield* enumerable
			}
		})
	}

	concat(other: AsyncIterable<T>): MemCollection<T> {
		const { enumerable } = this
		return new MemCollection({
			async *[Symbol.asyncIterator](): AsyncIterableIterator<T> {
				yield* enumerable
				yield* other
			}
		})
	}
	union(other: AsyncIterable<T>): MemCollection<T> {
		// TODO: after orderBy
		throw new Error('Not implemented')
	}
	intersect(other: AsyncIterable<T>): MemCollection<T> {
		// TODO: after orderBy
		throw new Error('Not implemented')
	}
	except(other: AsyncIterable<T>): MemCollection<T> {
		// TODO: after orderBy
		throw new Error('Not implemented')
	}

	multiplyBy<O extends BaseLinqEntry, R extends BaseLinqEntry>(
		other: Transmissible<List<O>, [T]>,
		resultSelector: Transmissible<R, [T, O]> | string
	): MemCollection<R> {
		const enumerable = this.enumerable,
			otherFct = functional(other)
		const selector = concatResultSelector(resultSelector)
		return new MemCollection({
			async *[Symbol.asyncIterator](): AsyncIterableIterator<R> {
				for await (const e of enumerable)
					for await (const o of await otherFct(e)) yield selector(e, o)
			}
		})
	}

	//#endregion
	//#region Query syntax interface

	join<I extends BaseLinqEntry, R extends BaseLinqEntry>(
		inner: AsyncIterable<I>,
		outerKeySelector: Comparable<T>,
		innerKeySelector: Comparable<I>,
		resultSelector: Transmissible<R, [T, I]> | string,
		innerVariable?: string
	): MemCollection<R> {
		const selector = concatResultSelector(resultSelector)
		return join<T, I, R>(
			this.enumerable,
			inner,
			outerKeySelector,
			innerKeySelector,
			async function* (outer: T, inner: I[]) {
				for (const i of inner) yield await Promise.resolve(selector(outer, i))
			},
			innerVariable
		)
	}

	groupJoin<I extends BaseLinqEntry, R extends BaseLinqEntry>(
		inner: AsyncIterable<I>,
		outerKeySelector: Comparable<T>,
		innerKeySelector: Comparable<I>,
		resultSelector: Transmissible<R, [T, I[]]> | string,
		innerVariable?: string
	): MemCollection<R> {
		const selector = concatResultSelector(resultSelector)
		return join(
			this.enumerable,
			inner,
			outerKeySelector,
			innerKeySelector,
			async function* (outer: T, inner: I[]) {
				yield await Promise.resolve(selector(outer, inner))
			},
			innerVariable
		)
	}

	groupBy<R extends BaseLinqEntry>(
		keySelector: Comparable<T>,
		elementSelector?: Transmissible<R, [T]>
	): MemCollection<Group<R>> {
		const me = this,
			functions = {
				keySelector: functional(keySelector),
				// If no elementSelector `group *...* by ...` is provided, use the identity function
				elementSelector: elementSelector ? functional(elementSelector) : id<T, R>
			}
		return new MemCollection<Group<R>>({
			async *[Symbol.asyncIterator](): AsyncIterableIterator<Group<R>> {
				const iterator: AsyncIterator<T> = me
					.order({ by: keySelector, way: 'asc' })
					[Symbol.asyncIterator]()
				let iteratorResult = await iterator.next()
				if (iteratorResult.done) return
				let key = await functions.keySelector(iteratorResult.value)
				while (!iteratorResult.done) {
					const groupKey = key,
						group: R[] = []
					do {
						group.push(await functions.elementSelector(iteratorResult.value))
						iteratorResult = await iterator.next()
						if (!iteratorResult.done) key = await functions.keySelector(iteratorResult.value)
					} while (!iteratorResult.done && key === groupKey)
					yield keyedGroup<R>(groupKey, new MemCollection<R>(group))
				}
			}
		})
	}

	where(predicate: Predicate<T>): MemCollection<T> {
		const { enumerable } = this,
			functions = { predicate: functional(predicate) }
		return new MemCollection({
			async *[Symbol.asyncIterator](): AsyncIterableIterator<T> {
				for await (const v of enumerable) {
					if (await functions.predicate(v)) yield <T>v
				}
			}
		})
	}
	let<O extends BaseLinqEntry, R extends BaseLinqQSEntry>(
		value: Transmissible<O, [T]>,
		variable: string
	): MemCollection<R> {
		const { enumerable } = this,
			functions = { value: functional(value) }
		return new MemCollection({
			async *[Symbol.asyncIterator](): AsyncIterableIterator<R> {
				for await (const v of enumerable) {
					yield <R>{ ...(<MemCollectionEntry>v), [variable]: await functions.value(v) }
				}
			}
		})
	}
	select<R extends BaseLinqEntry>(value: Transmissible<unknown, [T]>): MemCollection<R> {
		const { enumerable } = this,
			functions = { value: functional(value) }
		return new MemCollection({
			async *[Symbol.asyncIterator](): AsyncIterableIterator<R> {
				for await (const v of enumerable) {
					yield <R>await functions.value(v)
				}
			}
		})
	}

	/*selectMany<R>(value: Transmissible<AsyncIterable<R>, [T]>): MemCollection<R> {
		const { enumerable } = this,
			functions = { value: functional(value) }
		return new MemCollection({
			async *[Symbol.asyncIterator](): AsyncIterableIterator<R> {
				for await (const v of enumerable) {
					yield* await functions.value(v)
				}
			}
		})
	}*/

	order(...orders: OrderSpec<T>[]): MemCollection<T> {
		const { enumerable } = this
		const functions = { orders: orders.map(({ by }) => functional(by)) }
		return new MemCollection({
			async *[Symbol.asyncIterator](): AsyncIterableIterator<T> {
				const array = await toArray(enumerable),
					valued: [Primitive[], T][] = await Promise.all(
						array.map(async (v: T) => {
							const allValues = await Promise.all(
								functions.orders.map(async (order) => await order(v))
							)
							return [allValues, v]
						})
					)
				yield* valued
					.sort((a, b) => {
						for (let i = 0; i < orders.length; i++) {
							const aVal = a[0][i],
								bVal = b[0][i]
							if (aVal === bVal) continue
							return aVal < bVal === (orders[i].way === 'asc') ? -1 : 1
						}
						return 0
					})
					.map((a) => a[1])
			}
		})
	}

	wrap<R extends BaseLinqQSEntry>(name: string = ''): MemCollection<R> {
		const { enumerable } = this
		return new MemCollection<R>({
			async *[Symbol.asyncIterator](): AsyncIterableIterator<R> {
				for await (const v of enumerable) yield <R>{ [name]: v }
			}
		})
	}

	unwrap<R>(): MemCollection<R> {
		const { enumerable } = this
		return new MemCollection<R>({
			async *[Symbol.asyncIterator](): AsyncIterableIterator<R> {
				for await (const v of enumerable) yield unwrap<object, R>(<Awaited<object>>v)
			}
		})
	}

	//#endregion
}
