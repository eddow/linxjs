import knex from 'knex'
import {
	Comparable,
	LinqCollection,
	Numeric,
	BaseLinqEntry,
	Group,
	Predicate,
	Transmissible,
	List,
	OrderSpec,
	BaseLinqQSEntry,
	unwrap,
	toArray
} from '@linxjs/core'
import { FieldDesc, FieldsDesc, getTableColumns, QueryBuilder } from './dbUtils'
import { js2sqlComplex, js2sqlPrimitive } from './js2sql'

function buildObject<T>(fields: FieldDesc<string>, values: Record<string, any>) {
	const rv: Record<string, any> = {}
	if (typeof fields === 'string') return values[fields]
	else for (const field in fields) rv[field] = buildObject(fields[field], values)
	return <T>rv
}
//#endregion

export function sqlCollection<T extends BaseLinqEntry>(
	db: knex.Knex,
	tableName: string
): SqlCollection<T> {
	return new SqlCollection<T>(
		db,
		(async () => ({
			qb: db(tableName),
			fields: await getTableColumns(db, tableName).then((tfs) =>
				tfs.reduce((fields, field) => ({ ...fields, [field]: `${tableName}.${field}` }), {})
			),
			nameCounters: { [tableName]: 1 }
		}))()
	)
}

const linxCalcField = 'linx_calc_field'

interface SqlOptions {
	qb: QueryBuilder
	fields: FieldDesc
	nameCounters: Record<string, number>
}

export class SqlCollection<T> extends LinqCollection<T> {
	private readonly options: Promise<SqlOptions>
	constructor(
		private readonly db: knex.Knex,
		options: SqlOptions | Promise<SqlOptions>
	) {
		super()
		this.options = Promise.resolve(options)
	}
	[Symbol.asyncIterator](): AsyncIterator<T> {
		const { options, db } = this
		return (async function* () {
			let calcField = 1
			const { qb, fields } = await options,
				allFields: string[] = [],
				args: any[] = [],
				recurFields = async (field: FieldDesc) => {
					if (field instanceof Array) {
						const [fName, fArgs] = field
						if (fArgs?.length) args.push(...fArgs)
						else {
							const rex = /^[a-zA-Z_][\w$]*(?:\.[a-zA-Z_][\w$]*)*$/
							if (rex.test(fName)) {
								allFields.push(`${fName} AS \`${fName}\``)
								return fName
							}
						}
						const calcName = `${linxCalcField}${calcField++}`
						allFields.push(`${fName} AS ${calcName}`)
						return calcName
					}
					const rv: Record<string, any> = {}
					for (const f in <FieldsDesc>field) rv[f] = await recurFields(f)
					return rv
				}
			const struct = await recurFields(fields)
			const query = qb.clone().select(db.raw(allFields.join(', ')))
			console.info(query.toQuery())
			for (const r of await query) yield buildObject<T>(struct, r)
		})()
	}
	/**
	 *
	 * @param original Used when a table is added (from/join) to avoid duplicates
	 * @returns
	 */
	private async getName(original: string) {
		const { nameCounters } = await this.options

		if (nameCounters[original]) return `${original}${nameCounters[original]++}`
		nameCounters[original] = 1
		return original
	}
	async toArray(): Promise<T[]> {
		return toArray(this)
	}

	//#region aggregate

	async count(comparable?: Comparable<T>): Promise<number> {
		const { qb } = await this.options
		return await qb.count()
	}

	async sum(numeric?: Numeric<T>): Promise<number> {
		throw new Error('Not implemented: sum')
	}

	async average(numeric?: Numeric<T>): Promise<number> {
		throw new Error('Not implemented: average')
	}

	async min(comparable?: Comparable<T>): Promise<T> {
		throw new Error('Not implemented: min')
	}

	async max(comparable?: Comparable<T>): Promise<T> {
		throw new Error('Not implemented: max')
	}

	async aggregate<R>(seed: R, reducer: Transmissible<R, [R, T]>): Promise<R> {
		throw new Error('Not implemented: aggregate')
	}

	async all(predicate: Predicate<T>): Promise<boolean> {
		throw new Error('Not implemented: all')
	}

	async any(predicate: Predicate<T>): Promise<boolean> {
		throw new Error('Not implemented: any')
	}

	//#endregion
	//#region singletons

	async contains(item: T): Promise<boolean> {
		throw new Error('Not implemented: contains')
	}

	async first(predicate?: (item: T) => boolean): Promise<T> {
		throw new Error('Not implemented: first')
	}

	//	async firstOrDefault(predicate?: (item: T) => boolean, defaultValue: T = null): Promise<T> {
	async firstOrDefault(predicate?: (item: T) => boolean, defaultValue?: T): Promise<T> {
		throw new Error('Not implemented: firstOrDefault')
	}

	async last(predicate?: Predicate<T>): Promise<T> {
		throw new Error('Not implemented: last')
	}

	async lastOrDefault(predicate?: (item: T) => boolean, defaultValue?: T): Promise<T> {
		throw new Error('Not implemented: lastOrDefault')
	}

	async single(predicate?: (item: T) => boolean): Promise<T> {
		throw new Error('Not implemented: single')
	}

	async singleOrDefault(predicate?: (item: T) => boolean, defaultValue?: T): Promise<T> {
		throw new Error('Not implemented: singleOrDefault')
	}

	//#endregion
	//#region pagination

	take(n: number): SqlCollection<T> {
		throw new Error('Not implemented: take')
	}

	takeWhile(predicate: (item: T) => boolean): SqlCollection<T> {
		throw new Error('Not implemented: takeWhile')
	}

	takeLast(n: number): SqlCollection<T> {
		throw new Error('Not implemented: takeLast')
	}

	takeLastWhile(predicate: (item: T) => boolean): SqlCollection<T> {
		throw new Error('Not implemented: takeLastWhile')
	}

	skip(n: number): SqlCollection<T> {
		throw new Error('Not implemented: skip')
	}

	skipWhile(predicate: (item: T) => boolean): SqlCollection<T> {
		throw new Error('Not implemented: skipWhile')
	}

	//#endregion
	//#region set operations

	//	defaultIfEmpty(defaultValue: T = null): SqlCollection<T> {
	defaultIfEmpty(defaultValue?: T): SqlCollection<T> {
		throw new Error('Not implemented: defaultIfEmpty')
	}

	distinct(comparer?: (itemA: T, itemB: T) => boolean): SqlCollection<T> {
		throw new Error('Not implemented: distinct')
	}

	distinctBy<R = any>(by: Transmissible<R, [T]>): SqlCollection<T> {
		throw new Error('Not implemented: distinctBy')
	}

	append(...items: T[]): SqlCollection<T> {
		throw new Error('Not implemented: append')
	}

	prepend(...items: T[]): SqlCollection<T> {
		throw new Error('Not implemented: prepend')
	}

	concat(other: AsyncIterable<T>): SqlCollection<T> {
		throw new Error('Not implemented: concat')
	}

	union(other: AsyncIterable<T>): SqlCollection<T> {
		throw new Error('Not implemented: union')
	}

	intersect(other: AsyncIterable<T>): SqlCollection<T> {
		throw new Error('Not implemented: intersect')
	}

	except(other: AsyncIterable<T>): SqlCollection<T> {
		throw new Error('Not implemented: except')
	}

	multiplyBy<O extends BaseLinqEntry, R extends BaseLinqEntry>(
		other: Transmissible<List<O>, [T]>,
		selector: Transmissible<R, [T, O]> | string
	): SqlCollection<R> {
		throw new Error('Not implemented: multiplyBy')
	}

	//#endregion
	//#region Query syntax interface

	join<I extends BaseLinqEntry, R extends BaseLinqEntry>(
		inner: Transmissible<List<I>, [T]>,
		outerKeySelector: Comparable<T>,
		innerKeySelector: Comparable<I>,
		resultSelector: Transmissible<R, [T, I]> | string,
		innerVariable?: string
	): SqlCollection<R> {
		throw new Error('Not implemented: join')
	}

	groupJoin<I extends BaseLinqEntry, R extends BaseLinqEntry>(
		inner: Transmissible<List<I>, [T]>,
		outerKeySelector: Comparable<T>,
		innerKeySelector: Comparable<I>,
		resultSelector: Transmissible<R, [T, I[]]> | string,
		innerVariable?: string
	): SqlCollection<R> {
		throw new Error('Not implemented: groupJoin')
	}

	groupBy<R extends BaseLinqEntry>(
		keySelector: Comparable<T>,
		elementSelector?: Transmissible<R, [T]>
	): SqlCollection<Group<R>> {
		throw new Error('Not implemented: groupBy')
	}

	where(predicate: Predicate<T>): SqlCollection<T> {
		return new SqlCollection<T>(
			this.db,
			this.options.then(({ qb, fields, nameCounters }) => ({
				qb: qb.clone().whereRaw(...js2sqlPrimitive<boolean>(predicate, fields)),
				fields,
				nameCounters
			}))
		)
	}

	select<R extends BaseLinqEntry>(value: Transmissible<R, [T]>): SqlCollection<R> {
		return new SqlCollection<R>(
			this.db,
			this.options.then(async ({ qb, fields, nameCounters }) => {
				return {
					qb,
					fields: await js2sqlComplex(value, fields),
					nameCounters
				}
			})
		)
	}

	/*selectMany<R>(value: Transmissible<AsyncIterable<R>, [T]>): SqlCollection<R> {
		throw new Error('Not implemented: selectMany')
	}*/

	order(...orders: OrderSpec<T>[]): SqlCollection<T> {
		throw new Error('Not implemented: order')
	}

	let<O extends BaseLinqEntry, R extends BaseLinqQSEntry>(
		value: Transmissible<O, [T]>,
		variable: string
	): SqlCollection<R> {
		throw new Error('Not implemented: let')
	}
	wrap<R extends BaseLinqQSEntry>(name: string = ''): SqlCollection<R> {
		return new SqlCollection<R>(
			this.db,
			this.options.then(async ({ qb, fields, nameCounters }) => ({
				qb,
				fields: { [name]: fields },
				nameCounters
			}))
		)
	}
	unwrap<R extends BaseLinqEntry>(): SqlCollection<R> {
		return new SqlCollection<R>(
			this.db,
			this.options.then(async ({ qb, fields, nameCounters }) => ({
				qb,
				fields: unwrap(<FieldsDesc>fields),
				nameCounters
			}))
		)
	}

	//#endregion
}
