import { Hardcodable, InlineValue } from './parser'

export type BaseLinqEntry = any
export type BaseLinqQSEntry<T extends BaseLinqEntry = BaseLinqEntry> = T[]
export type Primitive = string | number | boolean
export type Numeric<T = any> = (item: T) => number
export type Comparable<T = any> = (item: T) => Primitive
export interface OrderFunction<T> {
	(item: T): Primitive
	asc: boolean
}
export function orderFunction<T>(
	fct: (item: any) => Primitive,
	way: 'asc' | 'desc' | boolean = 'asc'
): OrderFunction<T> {
	return Object.assign(fct, { asc: ['asc', true].includes(way) })
}
export abstract class LinqCollection<T extends BaseLinqEntry> implements AsyncIterable<T> {
	abstract [Symbol.asyncIterator](): AsyncIterator<T, any, any>

	abstract count(predicate?: (item: T) => boolean): Promise<number>
	abstract sum(numeric?: Numeric<T>): Promise<number>
	abstract average(numeric?: Numeric<T>): Promise<number>
	abstract min(comparable?: Comparable<T>): Promise<T>
	abstract max(comparable?: Comparable<T>): Promise<T>
	abstract aggregate<R>(seed: R, fct: (seed: R, item: T) => R): Promise<R>

	abstract all(fct: (item: T) => boolean): Promise<boolean>
	abstract any(fct: (item: T) => boolean): Promise<boolean>

	abstract contains(item: T): Promise<boolean>

	abstract first(predicate?: (item: T) => boolean): Promise<T>
	abstract firstOrDefault(predicate?: (item: T) => boolean, defaultValue?: T): Promise<T>
	abstract last(predicate?: (item: T) => boolean): Promise<T>
	abstract lastOrDefault(predicate?: (item: T) => boolean, defaultValue?: T): Promise<T>
	abstract single(predicate?: (item: T) => boolean): Promise<T>
	abstract singleOrDefault(predicate?: (item: T) => boolean, defaultValue?: T): Promise<T>
	abstract take(n: number): LinqCollection<T>
	abstract takeWhile(predicate: (item: T) => boolean): LinqCollection<T>
	abstract takeLast(n: number): LinqCollection<T>
	abstract takeLastWhile(predicate: (item: T) => boolean): LinqCollection<T>
	abstract skip(n: number): LinqCollection<T>
	abstract skipWhile(predicate: (item: T) => boolean): LinqCollection<T>

	abstract defaultIfEmpty(defaultValue?: T): LinqCollection<T>
	abstract distinct(comparer?: (itemA: T, itemB: T) => boolean): LinqCollection<T>
	abstract distinctBy(by: (item: T) => any): LinqCollection<T>

	abstract append(...items: T[]): LinqCollection<T>
	abstract prepend(...items: T[]): LinqCollection<T>
	abstract union(other: AsyncIterable<T>): LinqCollection<T>
	abstract concat(other: AsyncIterable<T>): LinqCollection<T>
	abstract intersect(other: AsyncIterable<T>): LinqCollection<T>
	abstract except(other: AsyncIterable<T>): LinqCollection<T>
	abstract multiplyBy<O extends BaseLinqEntry, R extends BaseLinqEntry>(
		other: AsyncIterable<O> | ((item: T) => AsyncIterable<O>),
		selector: (item: T, other: O) => R
	): LinqCollection<R>

	/**
	 * Performs an asynchronous left outer join on two sequences.
	 * @param inner The sequence to join to the current sequence.
	 * @param outerKeySelector A function to extract the join key from each element of the current sequence.
	 * @param innerKeySelector A function to extract the join key from each element of the inner sequence.
	 * @param resultSelector A function to create a result element from an element from the current sequence and a sequence of elements from the inner sequence.
	 * @returns A new sequence that contains the results of the join operation.
	 */
	abstract join<I extends BaseLinqEntry, R extends BaseLinqEntry>(
		inner: AsyncIterable<I>,
		outerKeySelector: (item: T) => Primitive,
		innerKeySelector: (item: I) => Primitive,
		resultSelector: (outer: T, inner: I) => R
	): LinqCollection<R>

	/**
	 * Performs an asynchronous left outer join on two sequences.
	 * @param inner The sequence to join to the current sequence.
	 * @param outerKeySelector A function to extract the join key from each element of the current sequence.
	 * @param innerKeySelector A function to extract the join key from each element of the inner sequence.
	 * @param resultSelector A function to create a result element from an element from the current sequence and a sequence of elements from the inner sequence.
	 * @returns A new sequence that contains the results of the join operation.
	 */
	abstract groupJoin<I extends BaseLinqEntry, R extends BaseLinqEntry>(
		inner: AsyncIterable<I>,
		outerKeySelector: (item: T) => Primitive,
		innerKeySelector: (item: I) => Primitive,
		resultSelector: (outer: T, inner: I[]) => R
	): LinqCollection<R>

	/**
	 * Groups the elements of the current sequence according to a specified key selector function.
	 * @param keySelector A function to extract the key from each element of the current sequence.
	 * @param elementSelector A function to select the elements from the current sequence (default is the identity function).
	 * @returns A new sequence that contains the results of the group operation.
	 */
	abstract groupBy<R extends BaseLinqEntry>(
		keySelector: (item: T) => Primitive,
		elementSelector?: (item: T) => R
	): LinqCollection<Group<R>>

	abstract toArray(): Promise<T[]>

	abstract where(predicate: (item: T) => boolean): LinqCollection<T>
	abstract select<R>(value: (v: T) => R): LinqCollection<R>

	orderBy(by: (v: T) => Primitive): OrderedLinqCollection<T> {
		return new OrderedLinqCollection(this, [orderFunction(by, 'asc')])
	}
	orderByDescending(by: (v: T) => Primitive): OrderedLinqCollection<T> {
		return new OrderedLinqCollection(this, [orderFunction(by, 'desc')])
	}

	abstract order(...orders: OrderFunction<T>[]): LinqCollection<T>
}

export interface LinqCollectionWithStatics<T extends BaseLinqEntry> {
	new (): LinqCollection<T>
}

export class OrderedLinqCollection<T extends BaseLinqEntry> extends LinqCollection<T> {
	//#region Forward to source/ordered
	count(predicate?: (item: T) => boolean): Promise<number> {
		return this.source.count(predicate)
	}
	sum(numeric?: Numeric<T>): Promise<number> {
		return this.source.sum(numeric)
	}
	average(numeric?: Numeric<T>): Promise<number> {
		return this.source.average(numeric)
	}
	min(comparable?: Comparable<T>): Promise<T> {
		return this.source.min(comparable)
	}
	max(comparable?: Comparable<T>): Promise<T> {
		return this.source.max(comparable)
	}
	aggregate<R>(seed: R, fct: (seed: R, item: T) => R): Promise<R> {
		return this.ordered.aggregate(seed, fct)
	}
	all(fct: (item: T) => boolean): Promise<boolean> {
		return this.source.all(fct)
	}
	any(fct: (item: T) => boolean): Promise<boolean> {
		return this.source.any(fct)
	}
	contains(item: T): Promise<boolean> {
		return this.source.contains(item)
	}
	first(predicate?: (item: T) => boolean): Promise<T> {
		return this.ordered.first(predicate)
	}
	firstOrDefault(predicate?: (item: T) => boolean, defaultValue?: T): Promise<T> {
		return this.ordered.firstOrDefault(predicate, defaultValue)
	}
	last(predicate?: (item: T) => boolean): Promise<T> {
		return this.ordered.last(predicate)
	}
	lastOrDefault(predicate?: (item: T) => boolean, defaultValue?: T): Promise<T> {
		return this.ordered.lastOrDefault(predicate, defaultValue)
	}
	single(predicate?: (item: T) => boolean): Promise<T> {
		return this.source.single(predicate)
	}
	singleOrDefault(predicate?: (item: T) => boolean, defaultValue?: T): Promise<T> {
		return this.source.singleOrDefault(predicate, defaultValue)
	}
	take(n: number): LinqCollection<T> {
		return this.ordered.take(n)
	}
	takeWhile(predicate: (item: T) => boolean): LinqCollection<T> {
		return this.ordered.takeWhile(predicate)
	}
	takeLast(n: number): LinqCollection<T> {
		return this.ordered.takeLast(n)
	}
	takeLastWhile(predicate: (item: T) => boolean): LinqCollection<T> {
		return this.ordered.takeLastWhile(predicate)
	}
	skip(n: number): LinqCollection<T> {
		return this.ordered.skip(n)
	}
	skipWhile(predicate: (item: T) => boolean): LinqCollection<T> {
		return this.ordered.skipWhile(predicate)
	}
	defaultIfEmpty(defaultValue?: T): LinqCollection<T> {
		return this.ordered.defaultIfEmpty(defaultValue)
	}
	distinct(comparer?: (itemA: T, itemB: T) => boolean): LinqCollection<T> {
		return this.ordered.distinct(comparer)
	}
	distinctBy(by: (item: T) => any): LinqCollection<T> {
		return this.ordered.distinctBy(by)
	}
	append(...items: T[]): LinqCollection<T> {
		return this.ordered.append(...items)
	}
	prepend(...items: T[]): LinqCollection<T> {
		return this.ordered.prepend(...items)
	}
	union(other: AsyncIterable<T>): LinqCollection<T> {
		return this.ordered.union(other)
	}
	concat(other: AsyncIterable<T>): LinqCollection<T> {
		return this.ordered.concat(other)
	}
	intersect(other: AsyncIterable<T>): LinqCollection<T> {
		return this.ordered.intersect(other)
	}
	except(other: AsyncIterable<T>): LinqCollection<T> {
		return this.ordered.except(other)
	}
	multiplyBy<O extends BaseLinqEntry, R extends BaseLinqEntry>(
		other: AsyncIterable<O> | ((item: T) => AsyncIterable<O>),
		selector: (item: T, other: O) => R
	): LinqCollection<R> {
		return this.ordered.multiplyBy(other, selector)
	}
	join<I extends BaseLinqEntry, R extends BaseLinqEntry>(
		inner: AsyncIterable<I>,
		outerKeySelector: (item: T) => Primitive,
		innerKeySelector: (item: I) => Primitive,
		resultSelector: (outer: T, inner: I) => R
	): LinqCollection<R> {
		return this.source.join(inner, outerKeySelector, innerKeySelector, resultSelector)
	}
	groupJoin<I extends BaseLinqEntry, R extends BaseLinqEntry>(
		inner: AsyncIterable<I>,
		outerKeySelector: (item: T) => Primitive,
		innerKeySelector: (item: I) => Primitive,
		resultSelector: (outer: T, inner: I[]) => R
	): LinqCollection<R> {
		return this.source.groupJoin(inner, outerKeySelector, innerKeySelector, resultSelector)
	}
	groupBy<R extends BaseLinqEntry>(
		keySelector: (item: T) => Primitive,
		elementSelector?: (item: T) => R
	): LinqCollection<Group<R>> {
		return this.source.groupBy(keySelector, elementSelector)
	}
	toArray(): Promise<T[]> {
		return this.ordered.toArray()
	}
	where(predicate: (item: T) => boolean): LinqCollection<T> {
		return this.ordered.where(predicate)
	}
	select<R>(value: (v: T) => R): LinqCollection<R> {
		return this.ordered.select(value)
	}
	order(...orders: OrderFunction<T>[]): LinqCollection<T> {
		return new OrderedLinqCollection(this.source, [...orders, ...this.orders])
	}
	[Symbol.asyncIterator](): AsyncIterator<T, any, any> {
		return this.ordered[Symbol.asyncIterator]()
	}

	//#endregion
	constructor(
		private readonly source: LinqCollection<T>,
		private readonly orders: OrderFunction<T>[]
	) {
		super()
	}

	private get ordered() {
		return this.source.order(...this.orders)
	}

	thenBy(by: OrderFunction<T>): OrderedLinqCollection<T> {
		return new OrderedLinqCollection(this.source, [...this.orders, orderFunction(by, 'asc')])
	}
	thenByDescending(by: OrderFunction<T>): OrderedLinqCollection<T> {
		return new OrderedLinqCollection(this.source, [...this.orders, orderFunction(by, 'desc')])
	}
}

export class SemanticError extends Error {
	constructor(code: string, parent?: Error) {
		super(`Unparsable code: ${code}`)
	}
}

export interface Group<T extends BaseLinqEntry> extends LinqCollection<T> {
	key: Primitive
}

export interface TransmissibleFunction<T extends BaseLinqEntry, R> {
	(param: T): R
	jsCode: string
	values?: any[]
}

export function keyedGroup<T extends BaseLinqEntry>(
	key: Primitive,
	value: LinqCollection<T>
): Group<T> {
	return Object.assign(value, { key })
}

function transmissibleFunction<T extends BaseLinqEntry, R>(
	fct: (parms: T) => R,
	jsCode: string,
	values?: any[]
): TransmissibleFunction<T, R> {
	return Object.assign(fct, values ? { jsCode, values } : { jsCode })
}

export const linxArgName = '$args$linx$',
	linxArguments = new RegExp(`${linxArgName.replace(/\$/g, '\\$')}\\[(\\d+)\\]`, 'g')

export type Collector = <T extends BaseLinqEntry>(source: any) => LinqCollection<T>
/*
export type Collector = <T extends BaseLinqEntry, M extends BaseLinqQSEntry = []>(
	source: any,
	factor?: LinqCollection<M>
) => LinqCollection<[...M, T]>*/

export function makeFunction<T extends BaseLinqQSEntry, R>(
	iv: any,
	variables: string[]
): TransmissibleFunction<T, R> {
	if (typeof iv === 'function')
		return transmissibleFunction((args: any[]) => iv(...args), iv.toString())
	if (iv instanceof InlineValue) {
		console.assert([iv.args.length, iv.args.length + 1].includes(iv.strings.length))
		if (iv.args.length) {
			const ivStrings = [...iv.strings],
				[strings, last] =
					iv.strings.length > iv.args.length ? [ivStrings, ivStrings.pop()] : [ivStrings, ''],
				fctCode = strings.map((s, i) => `${s} ${linxArgName}[${i}]`).join('') + last,
				fct = new Function([linxArgName, ...variables].join(','), 'return ' + fctCode)
			return transmissibleFunction(
				(args: any[]) =>
					fct(
						iv.args.map((iva) => (typeof iva === 'function' ? iva(...args) : iva)),
						...args
					),
				`(${variables.join(',')}) => ${fctCode}`,
				iv.args
			)
		}
		const value = iv.strings[0],
			fct = new Function(variables.join(','), `return ${value}`)
		return transmissibleFunction(
			(args: any[]) => fct(...args),
			`(${variables.join(',')}) => ${value}`
		)
	}
	return transmissibleFunction(() => <R>iv, null)
}

export const ai = {
	async *map<T = any, R = any>(
		asyncIterable: AsyncIterable<T>,
		fct: (item: T) => R
	): AsyncIterable<R> {
		for await (const item of asyncIterable) yield fct(item)
	}
}
