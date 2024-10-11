import knex, { Knex } from 'knex'
import { Comparable, LinqCollection, Numeric, BaseLinqEntry, Group, Predicate } from '@linxjs/core'

type QueryBuilder = knex.Knex.QueryBuilder
/**
 * Converts an iterable to a {@link LinqCollection} if it's not already one.
 * Server-first collector: if a source from a query is given and is more specified in the linq query,
 * the specifications will be added to the already existing collection and sent as a request
 * @param {AsyncIterable<T>} builder The iterable to convert.
 * @returns {LinqCollection<T>} The converted collection.
 */
export function sqlCollector<T extends BaseLinqEntry>(
	builder: QueryBuilder | SqlCollection
): LinqCollection<T> {
	return builder instanceof SqlCollection ? builder : new SqlCollection(builder)
}
//#endregion

export class SqlCollection<T extends BaseLinqEntry = BaseLinqEntry> extends LinqCollection<T> {
	constructor(private qb: QueryBuilder) {
		super()
	}
	[Symbol.asyncIterator](): AsyncIterator<T> {
		const { qb } = this
		return (async function* () {
			const result = <T[]>await qb.select()
			yield* result
		})()
	}
	toQuery(): string {
		return this.qb.toQuery()
	}
	async toArray(): Promise<T[]> {
		return await this.qb.select()
	}

	//#region aggregate

	async count(comparable?: Comparable<T>): Promise<number> {
		return await this.qb.count()
	}

	async sum(numeric?: Numeric<T>): Promise<number> {
		throw new Error('Not implemented')
	}

	async average(numeric?: Numeric<T>): Promise<number> {
		throw new Error('Not implemented')
	}

	async min(comparable?: Comparable<T>): Promise<T> {
		throw new Error('Not implemented')
	}

	async max(comparable?: Comparable<T>): Promise<T> {
		throw new Error('Not implemented')
	}

	async aggregate<R>(seed: R, reducer: Selector<[R, T], R>): Promise<R> {
		throw new Error('Not implemented')
	}

	async all(predicate: Predicate<T>): Promise<boolean> {
		throw new Error('Not implemented')
	}

	async any(predicate: Predicate<T>): Promise<boolean> {
		throw new Error('Not implemented')
	}

	//#endregion
	//#region singletons

	async contains(item: T): Promise<boolean> {
		throw new Error('Not implemented')
	}

	async first(predicate?: (item: T) => boolean): Promise<T> {
		throw new Error('Not implemented')
	}

	//	async firstOrDefault(predicate?: (item: T) => boolean, defaultValue: T = null): Promise<T> {
	async firstOrDefault(predicate?: (item: T) => boolean, defaultValue?: T): Promise<T> {
		throw new Error('Not implemented')
	}

	async last(predicate?: Predicate<T>): Promise<T> {
		throw new Error('Not implemented')
	}

	async lastOrDefault(predicate?: (item: T) => boolean, defaultValue?: T): Promise<T> {
		throw new Error('Not implemented')
	}

	async single(predicate?: (item: T) => boolean): Promise<T> {
		throw new Error('Not implemented')
	}

	async singleOrDefault(predicate?: (item: T) => boolean, defaultValue?: T): Promise<T> {
		throw new Error('Not implemented')
	}

	//#endregion
	//#region pagination

	take(n: number): LinqCollection<T> {
		throw new Error('Not implemented')
	}

	takeWhile(predicate: (item: T) => boolean): LinqCollection<T> {
		throw new Error('Not implemented')
	}

	takeLast(n: number): LinqCollection<T> {
		throw new Error('Not implemented')
	}

	takeLastWhile(predicate: (item: T) => boolean): LinqCollection<T> {
		throw new Error('Not implemented')
	}

	skip(n: number): LinqCollection<T> {
		throw new Error('Not implemented')
	}

	skipWhile(predicate: (item: T) => boolean): LinqCollection<T> {
		throw new Error('Not implemented')
	}

	//#endregion
	//#region set operations

	//	defaultIfEmpty(defaultValue: T = null): LinqCollection<T> {
	defaultIfEmpty(defaultValue?: T): LinqCollection<T> {
		throw new Error('Not implemented')
	}

	distinct(comparer?: (itemA: T, itemB: T) => boolean): LinqCollection<T> {
		throw new Error('Not implemented')
	}

	distinctBy<R = any>(by: Selector<[T], R>): LinqCollection<T> {
		throw new Error('Not implemented')
	}

	append(...items: T[]): LinqCollection<T> {
		throw new Error('Not implemented')
	}

	prepend(...items: T[]): LinqCollection<T> {
		throw new Error('Not implemented')
	}

	concat(other: AsyncIterable<T>): LinqCollection<T> {
		throw new Error('Not implemented')
	}

	union(other: AsyncIterable<T>): LinqCollection<T> {
		throw new Error('Not implemented')
	}

	intersect(other: AsyncIterable<T>): LinqCollection<T> {
		throw new Error('Not implemented')
	}

	except(other: AsyncIterable<T>): LinqCollection<T> {
		throw new Error('Not implemented')
	}

	multiplyBy<O extends BaseLinqEntry, R extends BaseLinqEntry>(
		other: AsyncIterable<O> | ((item: T) => AsyncIterable<O>),
		selector: Selector<[T, O], R>
	): LinqCollection<R> {
		throw new Error('Not implemented')
	}

	//#endregion
	//#region Query syntax interface

	join<I extends BaseLinqEntry, R extends BaseLinqEntry>(
		inner: AsyncIterable<I>,
		outerKeySelector: Comparable<T>,
		innerKeySelector: Comparable<I>,
		resultSelector: (outer: T, inner: I) => R
	): LinqCollection<R> {
		throw new Error('Not implemented')
	}

	groupJoin<I extends BaseLinqEntry, R extends BaseLinqEntry>(
		inner: AsyncIterable<I>,
		outerKeySelector: Comparable<T>,
		innerKeySelector: Comparable<I>,
		resultSelector: (outer: T, inner: I[]) => R
	): LinqCollection<R> {
		throw new Error('Not implemented')
	}

	groupBy<R extends BaseLinqEntry>(
		keySelector: Comparable<T>,
		elementSelector?: Selector<[T], R>
	): LinqCollection<Group<R>> {
		throw new Error('Not implemented')
	}

	where(predicate: Predicate<T>): LinqCollection<T> {
		throw new Error('Not implemented')
	}

	select<R>(value: Selector<[T], R>): LinqCollection<R> {
		return sqlCollector(this.qb.select(/*value*/))
	}

	raw(db: Knex, raw: string): LinqCollection<T> {
		return sqlCollector(this.qb.select(db.raw(raw)))
	}

	selectMany<R>(value: Selector<[T], AsyncIterable<R>>): LinqCollection<R> {
		throw new Error('Not implemented')
	}

	order(...orders: OrderFunction<T>[]): LinqCollection<T> {
		throw new Error('Not implemented')
	}

	//#endregion
}
