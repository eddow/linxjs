import {
	BaseLinqEntry,
	BaseLinqQSEntry,
	Comparable,
	Group,
	Numeric,
	OrderSpec,
	Predicate,
	Primitive,
	Transmissible
} from './value'

export type List<T extends BaseLinqEntry> = LinqCollection<T> | AsyncIterable<T> | Iterable<T>

export abstract class LinqCollection<T extends BaseLinqEntry = BaseLinqEntry>
	implements AsyncIterable<T>
{
	abstract [Symbol.asyncIterator](): AsyncIterator<T, any, any>
	abstract toArray(): Promise<T[]>
	//#region Retrieve one value from collection

	abstract count(comparable?: Comparable<T>): Promise<number>
	abstract sum(numeric?: Numeric<T>): Promise<number>
	abstract average(numeric?: Numeric<T>): Promise<number>
	abstract min(comparable?: Comparable<T>): Promise<T>
	abstract max(comparable?: Comparable<T>): Promise<T>
	abstract aggregate<R>(seed: R, reducer: Transmissible<R, [R, T]>): Promise<R>

	abstract all(predicate: Predicate<T>): Promise<boolean>
	abstract any(predicate?: Predicate<T>): Promise<boolean>

	abstract contains(item: T): Promise<boolean>

	abstract first(predicate?: Predicate<T>): Promise<T>
	abstract firstOrDefault(predicate?: Predicate<T>, defaultValue?: T): Promise<T>
	abstract last(predicate?: Predicate<T>): Promise<T>
	abstract lastOrDefault(predicate?: Predicate<T>, defaultValue?: T): Promise<T>
	abstract single(predicate?: Predicate<T>): Promise<T>
	abstract singleOrDefault(predicate?: Predicate<T>, defaultValue?: T): Promise<T>

	//#endregion
	//#region Pagination

	abstract take(n: number): LinqCollection<T>
	abstract takeWhile(predicate: Predicate<T>): LinqCollection<T>
	abstract takeLast(n: number): LinqCollection<T>
	abstract takeLastWhile(predicate: Predicate<T>): LinqCollection<T>
	abstract skip(n: number): LinqCollection<T>
	abstract skipWhile(predicate: Predicate<T>): LinqCollection<T>

	//#endregion
	//#region Transformations

	abstract defaultIfEmpty(defaultValue?: T): LinqCollection<T>
	abstract distinct(comparer?: Transmissible<boolean, [T, T]>): LinqCollection<T>
	abstract distinctBy(by: Comparable<T>): LinqCollection<T>

	abstract append(...items: T[]): LinqCollection<T>
	abstract prepend(...items: T[]): LinqCollection<T>
	abstract union(other: Transmissible<List<T>, [T]>): LinqCollection<T>
	abstract concat(other: Transmissible<List<T>, [T]>): LinqCollection<T>
	abstract intersect(other: Transmissible<List<T>, [T]>): LinqCollection<T>
	abstract except(other: Transmissible<List<T>, [T]>): LinqCollection<T>
	abstract multiplyBy<O extends BaseLinqEntry, R extends BaseLinqQSEntry>(
		other: Transmissible<List<O>, [T]>,
		resultSelector: Transmissible<R, [T, O]> | string
	): LinqCollection<R>

	/**
	 * Performs an asynchronous left outer join on two sequences.
	 * @param inner The sequence to join to the current sequence.
	 * @param outerKeySelector A function to extract the join key from each element of the current sequence.
	 * @param innerKeySelector A function to extract the join key from each element of the inner sequence.
	 * @param resultSelector A function to create a result element from an element from the current sequence and a sequence of elements from the inner sequence.
	 * @returns A new sequence that contains the results of the join operation.
	 */
	abstract join<I extends BaseLinqEntry, R extends BaseLinqQSEntry>(
		inner: Transmissible<List<I>, [T]>,
		outerKeySelector: Comparable<T>,
		innerKeySelector: Comparable<I>,
		resultSelector: Transmissible<R, [T, I]> | string
	): LinqCollection<R>

	/**
	 * Performs an asynchronous left outer join on two sequences.
	 * @param inner The sequence to join to the current sequence.
	 * @param outerKeySelector A function to extract the join key from each element of the current sequence.
	 * @param innerKeySelector A function to extract the join key from each element of the inner sequence.
	 * @param resultSelector A function to create a result element from an element from the current sequence and a sequence of elements from the inner sequence.
	 * @returns A new sequence that contains the results of the join operation.
	 */
	abstract groupJoin<I extends BaseLinqEntry, R extends BaseLinqQSEntry>(
		inner: Transmissible<List<I>, [T]>,
		outerKeySelector: Comparable<T>,
		innerKeySelector: Comparable<I>,
		resultSelector: Transmissible<R, [T, I[]]> | string
	): LinqCollection<R>

	/**
	 * Groups the elements of the current sequence according to a specified key selector function.
	 * @param keySelector A function to extract the key from each element of the current sequence.
	 * @param elementSelector A function to select the elements from the current sequence (default is the identity function).
	 * @returns A new sequence that contains the results of the group operation.
	 */
	abstract groupBy<R extends BaseLinqEntry>(
		keySelector: Comparable<T>,
		elementSelector?: Transmissible<R, [T]>
	): LinqCollection<Group<R>>

	//#endregion

	abstract where(predicate: Predicate<T>): LinqCollection<T>
	abstract select<R extends BaseLinqQSEntry>(value: Transmissible<R, [T]>): LinqCollection<R>

	orderBy(by: Comparable<T>): OrderedLinqCollection<T> {
		return new OrderedLinqCollection(this, [{ by, way: 'asc' }])
	}
	orderByDescending(by: Comparable<T>): OrderedLinqCollection<T> {
		return new OrderedLinqCollection(this, [{ by, way: 'desc' }])
	}

	//#endregion
	//#region Not in linq spec, internal usage

	abstract let<O extends BaseLinqEntry, R extends BaseLinqQSEntry>(
		value: Transmissible<O, [T]>,
		variable: string
	): LinqCollection<R>
	abstract order(...orders: OrderSpec<T>[]): LinqCollection<T>
	abstract wrap<R extends BaseLinqQSEntry>(name?: string): LinqCollection<R>
	abstract unwrap<R extends BaseLinqEntry>(): LinqCollection<R>

	//#endregion
}

export class OrderedLinqCollection<T extends BaseLinqEntry> extends LinqCollection<T> {
	constructor(
		private readonly source: LinqCollection<T>,
		private readonly orders: OrderSpec<T>[]
	) {
		super()
	}

	private get ordered() {
		return this.source.order(...this.orders)
	}

	thenBy(by: Comparable<T>): OrderedLinqCollection<T> {
		return new OrderedLinqCollection(this.source, [...this.orders, { by, way: 'asc' }])
	}
	thenByDescending(by: Comparable<T>): OrderedLinqCollection<T> {
		return new OrderedLinqCollection(this.source, [...this.orders, { by, way: 'desc' }])
	}

	//#region Forward to source/ordered
	count(predicate?: Predicate<T>): Promise<number> {
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
	aggregate<R>(seed: R, reducer: Transmissible<R, [R, T]>): Promise<R> {
		return this.ordered.aggregate(seed, reducer)
	}
	all(predicate: Predicate<T>): Promise<boolean> {
		return this.source.all(predicate)
	}
	any(predicate?: Predicate<T>): Promise<boolean> {
		return this.source.any(predicate)
	}
	contains(item: T): Promise<boolean> {
		return this.source.contains(item)
	}
	first(predicate?: Predicate<T>): Promise<T> {
		return this.ordered.first(predicate)
	}
	firstOrDefault(predicate?: Predicate<T>, defaultValue?: T): Promise<T> {
		return this.ordered.firstOrDefault(predicate, defaultValue)
	}
	last(predicate?: Predicate<T>): Promise<T> {
		return this.ordered.last(predicate)
	}
	lastOrDefault(predicate?: Predicate<T>, defaultValue?: T): Promise<T> {
		return this.ordered.lastOrDefault(predicate, defaultValue)
	}
	single(predicate?: Predicate<T>): Promise<T> {
		return this.source.single(predicate)
	}
	singleOrDefault(predicate?: Predicate<T>, defaultValue?: T): Promise<T> {
		return this.source.singleOrDefault(predicate, defaultValue)
	}
	take(n: number): LinqCollection<T> {
		return this.ordered.take(n)
	}
	takeWhile(predicate: Predicate<T>): LinqCollection<T> {
		return this.ordered.takeWhile(predicate)
	}
	takeLast(n: number): LinqCollection<T> {
		return this.ordered.takeLast(n)
	}
	takeLastWhile(predicate: Predicate<T>): LinqCollection<T> {
		return this.ordered.takeLastWhile(predicate)
	}
	skip(n: number): LinqCollection<T> {
		return this.ordered.skip(n)
	}
	skipWhile(predicate: Predicate<T>): LinqCollection<T> {
		return this.ordered.skipWhile(predicate)
	}
	defaultIfEmpty(defaultValue?: T): LinqCollection<T> {
		return this.ordered.defaultIfEmpty(defaultValue)
	}
	distinct(comparer?: Transmissible<boolean, [T, T]>): LinqCollection<T> {
		return this.ordered.distinct(comparer)
	}
	distinctBy(by: Comparable<T>): LinqCollection<T> {
		return this.ordered.distinctBy(by)
	}
	append(...items: T[]): LinqCollection<T> {
		return this.ordered.append(...items)
	}
	prepend(...items: T[]): LinqCollection<T> {
		return this.ordered.prepend(...items)
	}
	union(other: Transmissible<List<T>, [T]>): LinqCollection<T> {
		return this.ordered.union(other)
	}
	concat(other: Transmissible<List<T>, [T]>): LinqCollection<T> {
		return this.ordered.concat(other)
	}
	intersect(other: Transmissible<List<T>, [T]>): LinqCollection<T> {
		return this.ordered.intersect(other)
	}
	except(other: Transmissible<List<T>, [T]>): LinqCollection<T> {
		return this.ordered.except(other)
	}
	multiplyBy<O extends BaseLinqEntry, R extends BaseLinqQSEntry>(
		other: Transmissible<List<O>, [T]>,
		resultSelector: Transmissible<R, [T, O]> | string
	): LinqCollection<R> {
		return this.ordered.multiplyBy(other, resultSelector)
	}
	join<I extends BaseLinqEntry, R extends BaseLinqQSEntry>(
		inner: Transmissible<List<I>, [T]>,
		outerKeySelector: Comparable<T>,
		innerKeySelector: Comparable<I>,
		resultSelector: Transmissible<R, [T, I]> | string
	): LinqCollection<R> {
		return this.source.join(inner, outerKeySelector, innerKeySelector, resultSelector)
	}
	groupJoin<I extends BaseLinqEntry, R extends BaseLinqQSEntry>(
		inner: Transmissible<List<I>, [T]>,
		outerKeySelector: Comparable<T>,
		innerKeySelector: Comparable<I>,
		resultSelector: Transmissible<R, [T, I[]]> | string
	): LinqCollection<R> {
		return this.source.groupJoin(inner, outerKeySelector, innerKeySelector, resultSelector)
	}
	groupBy<R extends BaseLinqEntry>(
		keySelector: Comparable<T>,
		elementSelector?: Transmissible<R, [T]>
	): LinqCollection<Group<R>> {
		return this.source.groupBy(keySelector, elementSelector)
	}
	toArray(): Promise<T[]> {
		return this.ordered.toArray()
	}
	where(predicate: Predicate<T>): LinqCollection<T> {
		return this.ordered.where(predicate)
	}
	select<R extends BaseLinqQSEntry>(value: Transmissible<R, [T]>): LinqCollection<R> {
		return this.ordered.select(value)
	}
	let<O extends BaseLinqEntry, R extends BaseLinqQSEntry>(
		value: Transmissible<O, [T]>,
		variable: string
	): LinqCollection<R> {
		return this.ordered.let<O, R>(value, variable)
	}
	order(...orders: OrderSpec<T>[]): LinqCollection<T> {
		return new OrderedLinqCollection(this.source, [...orders, ...this.orders])
	}

	wrap<R extends BaseLinqQSEntry>(name?: string): LinqCollection<R> {
		return this.ordered.wrap(name)
	}

	unwrap<R extends BaseLinqEntry>(): LinqCollection<R> {
		return this.ordered.unwrap()
	}
	[Symbol.asyncIterator](): AsyncIterator<T, any, any> {
		return this.ordered[Symbol.asyncIterator]()
	}

	//#endregion
}
