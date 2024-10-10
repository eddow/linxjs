import {
	Comparable,
	LinqCollection,
	Numeric,
	Primitive,
	SemanticError,
	OrderFunction,
	BaseLinqEntry,
	orderFunction,
	Group,
	keyedGroup,
	BaseLinqQSEntry
} from '@linxjs/core'

//#region Helpers
class PromisedIterator<T> implements AsyncIterator<T> {
	constructor(private it: Iterator<T>) {
		if (!it.return) this.return = undefined
		if (!it.throw) this.throw = undefined
	}
	async next(): Promise<IteratorResult<T>> {
		return this.it.next()
	}
	async return(): Promise<IteratorResult<T>> {
		return this.it.return()
	}
	async throw(e: any): Promise<IteratorResult<T>> {
		return this.it.throw(e)
	}
}

class PromisedIterable<T> implements AsyncIterable<T> {
	constructor(private it: Iterable<T>) {}
	[Symbol.asyncIterator](): AsyncIterator<T> {
		return new PromisedIterator(this.it[Symbol.iterator]())
	}
}

export async function toArray<T = any>(enumerable: AsyncIterable<T>): Promise<T[]> {
	const rv = []
	for await (const v of enumerable) rv.push(v)
	return rv
}

function comparablePair<T>(v: T, comparable?: Comparable<T>): [T, Primitive] {
	const c: Primitive = comparable ? comparable(v) : <Primitive>v
	if (!['number', 'string', 'boolean'].includes(typeof c))
		throw new SemanticError("Can't sum non-numeric values")
	return [v, c]
}

export function memCollection<T extends BaseLinqEntry>(
	enumerable: AsyncIterable<T>
): MemCollection<T> {
	return enumerable instanceof MemCollection ? enumerable : new MemCollection(enumerable)
}

function join<T extends BaseLinqEntry, I extends BaseLinqEntry, R extends BaseLinqEntry>(
	outer: AsyncIterable<T>,
	inner: AsyncIterable<I>,
	outerKeySelector: (item: T) => Primitive,
	innerKeySelector: (item: I) => Primitive,
	resultSelector: (outer: T, inner: I[]) => Iterable<R>
): MemCollection<R> {
	return new MemCollection({
		async *[Symbol.asyncIterator](): AsyncIterableIterator<R> {
			const outerIterator = memCollection(outer)
					.order(orderFunction(outerKeySelector))
					[Symbol.asyncIterator](),
				innerIterator = memCollection(inner)
					.order(orderFunction(innerKeySelector))
					[Symbol.asyncIterator]()
			let [outerIteratorResult, innerIteratorResult] = await Promise.all([
				outerIterator.next(),
				innerIterator.next()
			])
			if (outerIteratorResult.done) return
			if (!innerIteratorResult.done) {
				let [outerKey, innerKey] = [
					outerKeySelector(outerIteratorResult.value),
					innerKeySelector(innerIteratorResult.value)
				]
				do {
					if (outerKey < innerKey) {
						yield* resultSelector(outerIteratorResult.value, [])
						outerIteratorResult = await outerIterator.next()
						if (!outerIteratorResult.done) outerKey = outerKeySelector(outerIteratorResult.value)
					} else if (outerKey > innerKey) {
						innerIteratorResult = await innerIterator.next()
						if (!innerIteratorResult.done) innerKey = innerKeySelector(innerIteratorResult.value)
					} else {
						const key = outerKey,
							outerEntries = [],
							innerEntries = []
						do {
							outerEntries.push(outerIteratorResult.value)
							outerIteratorResult = await outerIterator.next()
							if (!outerIteratorResult.done) outerKey = outerKeySelector(outerIteratorResult.value)
						} while (!outerIteratorResult.done && outerKey === key)
						do {
							innerEntries.push(innerIteratorResult.value)
							innerIteratorResult = await innerIterator.next()
							if (!innerIteratorResult.done) innerKey = innerKeySelector(innerIteratorResult.value)
						} while (!innerIteratorResult.done && innerKey === key)
						for (const o of outerEntries) yield* resultSelector(o, innerEntries)
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

	async count(predicate?: (item: T) => boolean): Promise<number> {
		if (this.length !== undefined && !predicate) return this.length
		let rv = 0
		for await (const v of this.enumerable) if (!predicate || predicate(v)) rv++
		return Promise.resolve(rv)
	}

	async sum(numeric?: Numeric<T>): Promise<number> {
		let rv = 0
		for await (const v of this.enumerable) {
			const n = numeric ? numeric(v) : v
			if (typeof n !== 'number') throw new SemanticError("Can't sum non-numeric values")
			rv += n
		}
		return rv
	}
	async average(numeric?: Numeric<T>): Promise<number> {
		let sum = 0,
			count = 0
		for await (const v of this.enumerable) {
			const n = numeric ? numeric(v) : v
			if (typeof n !== 'number') throw new SemanticError("Can't sum non-numeric values")
			sum += n
			count++
		}
		return count ? sum / count : NaN
	}
	async min(comparable?: Comparable<T>): Promise<T> {
		let rv: [T, Primitive]
		for await (const v of this.enumerable) {
			const tv = comparablePair(v, comparable)
			if (rv === undefined) rv = comparablePair(v, comparable)
			else if (tv[1] < rv[1]) rv = tv
		}
		return rv[0]
	}
	async max(comparable?: Comparable<T>): Promise<T> {
		let rv: [T, Primitive]
		for await (const v of this.enumerable) {
			const tv = comparablePair(v, comparable)
			if (rv === undefined) rv = comparablePair(v, comparable)
			else if (tv[1] > rv[1]) rv = tv
		}
		return rv[0]
	}
	async aggregate<R>(seed: R, fct: (seed: R, item: T) => R): Promise<R> {
		let rv = seed
		for await (const v of this.enumerable) rv = fct(rv, v)
		return rv
	}

	async all(fct: (item: T) => boolean): Promise<boolean> {
		for await (const v of this.enumerable) if (!fct(v)) return false
		return true
	}
	async any(fct: (item: T) => boolean): Promise<boolean> {
		for await (const v of this.enumerable) if (fct(v)) return true
		return false
	}

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
	async last(predicate?: (item: T) => boolean): Promise<T> {
		let rv: T
		for await (const v of this.enumerable) if (!predicate || predicate(v)) rv = v
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

	take(n: number): LinqCollection<T> {
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
	takeWhile(predicate: (item: T) => boolean): LinqCollection<T> {
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
	takeLast(n: number): LinqCollection<T> {
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
	takeLastWhile(predicate: (item: T) => boolean): LinqCollection<T> {
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

	skip(n: number): LinqCollection<T> {
		const { enumerable } = this
		return new MemCollection({
			async *[Symbol.asyncIterator](): AsyncIterableIterator<T> {
				let i = 0
				for await (const v of enumerable) if (i++ >= n) yield v
			}
		})
	}

	skipWhile(predicate: (item: T) => boolean): LinqCollection<T> {
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

	defaultIfEmpty(defaultValue: T = null): LinqCollection<T> {
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
	distinct(comparer?: (itemA: T, itemB: T) => boolean): LinqCollection<T> {
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

	distinctBy<R = any>(by: (item: T) => R): LinqCollection<T> {
		const { enumerable } = this
		return new MemCollection({
			async *[Symbol.asyncIterator](): AsyncIterableIterator<T> {
				const seen = new Set<R>()
				for await (const v of enumerable) {
					const key = by(v)
					if (!seen.has(key)) {
						seen.add(key)
						yield v
					}
				}
			}
		})
	}

	append(...items: T[]): LinqCollection<T> {
		const { enumerable } = this
		return new MemCollection({
			async *[Symbol.asyncIterator](): AsyncIterableIterator<T> {
				yield* enumerable
				yield* items
			}
		})
	}
	prepend(...items: T[]): LinqCollection<T> {
		const { enumerable } = this
		return new MemCollection({
			async *[Symbol.asyncIterator](): AsyncIterableIterator<T> {
				yield* items
				yield* enumerable
			}
		})
	}

	concat(other: AsyncIterable<T>): LinqCollection<T> {
		const { enumerable } = this
		return new MemCollection({
			async *[Symbol.asyncIterator](): AsyncIterableIterator<T> {
				yield* enumerable
				yield* other
			}
		})
	}
	union(other: AsyncIterable<T>): LinqCollection<T> {
		// TODO: after orderBy
		throw new Error('Not implemented')
	}
	intersect(other: AsyncIterable<T>): LinqCollection<T> {
		// TODO: after orderBy
		throw new Error('Not implemented')
	}
	except(other: AsyncIterable<T>): LinqCollection<T> {
		// TODO: after orderBy
		throw new Error('Not implemented')
	}

	multiplyBy<O extends BaseLinqEntry, R extends BaseLinqEntry>(
		other: AsyncIterable<O> | ((item: T) => AsyncIterable<O>),
		selector: (item: T, other: O) => R
	): LinqCollection<R> {
		const { enumerable } = this
		return new MemCollection({
			async *[Symbol.asyncIterator](): AsyncIterableIterator<R> {
				const otherFct = typeof other === 'function' ? other : () => other
				for await (const e of enumerable) for await (const o of otherFct(e)) yield selector(e, o)
			}
		})
	}

	join<I extends BaseLinqEntry, R extends BaseLinqEntry>(
		inner: AsyncIterable<I>,
		outerKeySelector: (item: T) => Primitive,
		innerKeySelector: (item: I) => Primitive,
		resultSelector: (outer: T, inner: I) => R
	): LinqCollection<R> {
		return join<T, I, R>(
			this.enumerable,
			inner,
			outerKeySelector,
			innerKeySelector,
			function* (outer: T, inner: I[]) {
				for (const i of inner) yield resultSelector(outer, i)
			}
		)
	}

	groupJoin<I extends BaseLinqEntry, R extends BaseLinqEntry>(
		inner: AsyncIterable<I>,
		outerKeySelector: (item: T) => Primitive,
		innerKeySelector: (item: I) => Primitive,
		resultSelector: (outer: T, inner: I[]) => R
	): LinqCollection<R> {
		return join(
			this.enumerable,
			inner,
			outerKeySelector,
			innerKeySelector,
			(outer: T, inner: I[]) => [resultSelector(outer, inner)]
		)
	}

	/**
	 * Groups the elements of the current sequence according to a specified key selector function.
	 * @param keySelector A function to extract the key from each element of the current sequence.
	 * @param elementSelector A function to select the elements from the current sequence (default is the identity function).
	 * @returns A new sequence that contains the results of the group operation.
	 */
	groupBy<R extends BaseLinqEntry>(
		keySelector: (item: T) => Primitive,
		elementSelector?: (item: T) => R
	): LinqCollection<Group<R>> {
		const me = this
		return new MemCollection<Group<R>>({
			async *[Symbol.asyncIterator](): AsyncIterableIterator<Group<R>> {
				const iterator: AsyncIterator<T> = me
					.order(orderFunction(keySelector))
					[Symbol.asyncIterator]()
				let iteratorResult = await iterator.next()
				if (iteratorResult.done) return
				let key = keySelector(iteratorResult.value)
				while (!iteratorResult.done) {
					const groupKey = key,
						group: R[] = []
					do {
						group.push(elementSelector(iteratorResult.value))
						iteratorResult = await iterator.next()
						if (!iteratorResult.done) key = keySelector(iteratorResult.value)
					} while (!iteratorResult.done && key === groupKey)
					yield keyedGroup<R>(groupKey, new MemCollection<R>(group))
				}
			}
		})
	}

	//#region Query syntax interface (engine) AND reular interface

	where(predicate: (item: T) => boolean): LinqCollection<T> {
		const { enumerable } = this
		return new MemCollection({
			async *[Symbol.asyncIterator](): AsyncIterableIterator<T> {
				for await (const v of enumerable) {
					if (predicate(v)) yield <T>v
				}
			}
		})
	}
	select<R>(value: (v: T) => R): LinqCollection<R> {
		const { enumerable } = this
		return new MemCollection({
			async *[Symbol.asyncIterator](): AsyncIterableIterator<R> {
				for await (const v of enumerable) {
					yield value(v)
				}
			}
		})
	}
	//TODO selectMany

	//#endregion
	//#region Query syntax interface (engine)

	order(...orders: OrderFunction<T>[]): LinqCollection<T> {
		const { enumerable } = this
		return new MemCollection({
			async *[Symbol.asyncIterator](): AsyncIterableIterator<T> {
				yield* (await toArray(enumerable)).sort((a, b) => {
					for (const fct of orders) {
						const aVal = fct(a),
							bVal = fct(b)
						if (aVal === bVal) continue
						return aVal < bVal === fct.asc ? -1 : 1
					}
					return 0
				})
			}
		})
	}

	//joinInto(other: LinqCollection<T>, by: (item: T) => string): LinqCollection<T> {}

	//#endregion
}
