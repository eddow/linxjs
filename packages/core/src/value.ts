import type { LinqCollection } from './collection'

export class InlineValue {
	constructor(
		public args: any[] = [],
		public strings: string[] = []
	) {}
}

export type BaseLinqEntry = any
export type BaseLinqQSEntry = object

export class SemanticError extends Error {
	constructor(message: string, parent?: Error) {
		super(message)
	}
}

export interface Group<T extends BaseLinqEntry> extends LinqCollection<T> {
	key: Primitive
}

export function keyedGroup<T extends BaseLinqEntry>(
	key: Primitive,
	value: LinqCollection<T>
): Group<T> {
	return Object.assign(value, { key })
}

//#region async-ed

export class PromisedIterator<T> implements AsyncIterator<T> {
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

export class PromisedIterable<T> implements AsyncIterable<T> {
	constructor(private it: Iterable<T>) {}
	[Symbol.asyncIterator](): AsyncIterator<T> {
		return new PromisedIterator(this.it[Symbol.iterator]())
	}
}

//#endregion

//#region transmissible
export function getVariablesUsed(body: string) {
	// Remove strings from the function body (to avoid capturing parts of strings)
	const bodyWithoutStrings = body.replace(/(["'`])(\\?.)*?\1/g, '')

	// Find all identifiers, including those used in array indices
	const identifiers = [...bodyWithoutStrings.matchAll(/\b(\.?[a-zA-Z_]\w*)\b/g)].map(
		(match) => match[0]
	)

	// Filter out keywords and numbers, but capture index variables in brackets and object properties
	const globals = identifiers.filter(
		(id) =>
			!['return', 'if', 'else', 'true', 'false', 'null', 'undefined'].includes(id) && // Exclude JS keywords
			!/^\./.test(id) // Exclude object properties (e.g., `obj.prop`, but keep `x` in `x.value`)
	)

	return [...new Set(globals)] // Remove duplicates
}

export const linxArgName = '$args$linx$'
export function analyzeLambda(lambda: (...args: any[]) => any) {
	const str = lambda
			.toString()
			.replace(/\n|\r|(^async )|(await )/g, ' ')
			.trim(),
		match = /^(?:(?:\((.*?)\))|((?:.*?)))\s*\=\>\s*(.*)$/.exec(str)
	if (!match) throw new SyntaxError(`Invalid function (must be lambda): ${str}`)
	return {
		params: (match[1] || match[2]).split(',').map((s) => s.trim()),
		body: match[3]
	}
}
export class TransmissibleFunction<R, T extends BaseLinqEntry[] = [BaseLinqEntry]> {
	/** The parameters from the QS entry */
	readonly params: string[]
	/** The given argument values */
	readonly args?: any[]
	readonly body: string
	/** If the value is js-given and constant */
	readonly constant?: R
	readonly fromQSEntry: boolean
	constructor(
		public readonly from: ((...args: T) => R) | ((...args: T) => Promise<R>) | InlineValue,
		availableParams: string[] | number
	) {
		this.fromQSEntry = typeof availableParams !== 'number'
		function setParams(params: string[] | string) {
			if (typeof params === 'string') params = getVariablesUsed(params)
			if (typeof availableParams === 'number') {
				if (params.length !== availableParams)
					throw new SyntaxError(
						`Expected ${availableParams} parameter(s), but got ${params.length}`
					)
			} else {
				const absentParams = params.filter((p: string) => !availableParams.includes(p))
				if (absentParams.length)
					throw new SemanticError(`Unknown argument(s): ${absentParams.join(', ')}`)
			}
			return params
		}
		if (typeof from === 'function') {
			const analyze = analyzeLambda(from)
			this.params = setParams(analyze.params)
			this.body = analyze.body
		} else if (from instanceof InlineValue) {
			if (!from.args.length) {
				if (from.strings.length !== 1)
					throw new SyntaxError(`Invalid inline value: ${from.strings.join(', ')}`)
				this.params = setParams((this.body = from.strings[0]))
			} else if (!from.strings.length) {
				if (from.args.length !== 1)
					throw new SyntaxError(`Invalid inline value: ${from.args.join(', ')}`)
				this.constant = (this.args = from.args)[0]
				this.params = [linxArgName]
				this.body = `${linxArgName}[0]`
			} else if ([from.args.length, from.args.length + 1].includes(from.strings.length)) {
				const ivStrings = [...from.strings],
					[strings, last] =
						from.strings.length > from.args.length ? [ivStrings, ivStrings.pop()] : [ivStrings, '']

				this.body = strings.map((s, i) => `${s} ${linxArgName}[${i}]`).join('') + last
				this.params = [linxArgName, ...(<string[]>availableParams)]
				this.args = from.args
			} else
				throw new SyntaxError(
					`Invalid inline value (strings: ${from.strings.length}, args: ${from.args.length})`
				)
		} else {
			throw new Error(`Invalid value: ${from}`)
		}
	}
}

export type Transmissible<R, T extends BaseLinqEntry[] = BaseLinqEntry[]> =
	| TransmissibleFunction<R, T>
	| R
	| ((...args: T) => R)
	| ((...args: T) => Promise<R>)
export function transmissibleFunction<R, T extends BaseLinqEntry[] = BaseLinqEntry[]>(
	transmissible: Transmissible<R, T>,
	availableParams: number = 1
) {
	if (transmissible instanceof TransmissibleFunction)
		return <TransmissibleFunction<R, T>>transmissible
	if (typeof transmissible === 'function')
		return new TransmissibleFunction<R, T>(<(...args: T) => R>transmissible, availableParams)
	return new TransmissibleFunction<R, T>(new InlineValue([transmissible]), availableParams)
}
export type Primitive = string | number | boolean
export type Numeric<T extends BaseLinqEntry> = Transmissible<number, [T]>
export type Comparable<T extends BaseLinqEntry> = Transmissible<Primitive, [T]>
export type Predicate<T extends BaseLinqEntry> = Transmissible<boolean, [T]>
export interface OrderSpec<T extends BaseLinqEntry = BaseLinqEntry> {
	by: Comparable<T>
	way: 'asc' | 'desc'
}

//#endregion
