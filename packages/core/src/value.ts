import type { LinqCollection } from './collection'
import type { TemplateStringsReader } from './parser'

export class LinqParseError extends Error {
	constructor(reader: TemplateStringsReader, message: string) {
		const part = reader.parts[reader.part],
			indicator = !part
				? '-end of linq-'
				: part.substring(0, reader.posInPart) + '<^>' + part.substring(reader.posInPart)
		super(indicator + '\n' + message)
		this.name = 'LinqParseError'
	}
}

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
		this.name = 'SemanticError'
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
	async return?(): Promise<IteratorResult<T>> {
		return this.it.return!()
	}
	async throw?(e: any): Promise<IteratorResult<T>> {
		return this.it.throw!(e)
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

	// Remove object keys (anything before a colon in an object literal)
	const bodyWithoutKeys = bodyWithoutStrings.replace(/\b\w+\s*:/g, '')

	// Find all identifiers, including those used in array indices
	const identifiers = [...bodyWithoutKeys.matchAll(/\b(\.?[a-zA-Z_]\w*)\b/g)].map(
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
		match = /^(?:(?:\((.*?)\))|((?:.*?)))\s*\=\>\s*(.*?)\s*$/.exec(str)
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
export type Primitive = string | number | bigint | boolean | RegExp | null | undefined
export type Numeric<T extends BaseLinqEntry> = Transmissible<number, [T]>
export type Comparable<T extends BaseLinqEntry> = Transmissible<Primitive, [T]>
export type Predicate<T extends BaseLinqEntry> = Transmissible<boolean, [T]>
export interface OrderSpec<T extends BaseLinqEntry = BaseLinqEntry> {
	by: Comparable<T>
	way: 'asc' | 'desc'
}

//#endregion
//#region general helpers for implementations

export async function toArray<T = any>(enumerable: AsyncIterable<T>): Promise<T[]> {
	const rv: T[] = []
	for await (const v of enumerable) rv.push(v)
	return rv
}

export function unwrap<T extends object, R extends BaseLinqEntry>(v: T): R {
	if (typeof v !== 'object') new Error(`Not a wrapped object: ${v}`)
	const keys = Object.keys(v)
	if (keys.length !== 1)
		throw new Error(`Selection cannot select several objects: ${keys.join(', ')}`)
	return <R>(<Record<string, any>>v)[keys[0]]
}

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

export function promised<T extends any[], R>(
	fct: (...args: T) => R | Promise<R>
): (...args: T) => Promise<R> {
	return (...args: T) => Promise.resolve(fct(...args))
}

const fctCache = new WeakMap<TransmissibleFunction<any>, (...args: any[]) => Promise<any>>()
/**
 * Make a JS-callable function from a transmissible
 * @param transmissible
 * @param availableParams
 * @returns
 */
export function functional<R, T extends BaseLinqEntry[] = BaseLinqEntry[]>(
	transmissible?: Transmissible<R, T>,
	availableParams: number = 1
): (...args: T) => Promise<R> {
	if (!transmissible) return <(...args: T) => Promise<R>>transmissible
	const tf = cachedTransmissibleFunction(transmissible, availableParams)
	let rv = <(...args: T) => Promise<R>>fctCache.get(<TransmissibleFunction<any>>tf)
	if (!rv) {
		let tf: TransmissibleFunction<R, T>, fct: (...args: any[]) => Promise<R>
		if (transmissible instanceof TransmissibleFunction) tf = transmissible
		else if (typeof transmissible === 'function')
			tf = new TransmissibleFunction(<(...args: T) => R>transmissible, availableParams)
		else tf = new TransmissibleFunction(new InlineValue([transmissible]), availableParams)

		if (tf.constant) fct = () => Promise.resolve(tf.constant!)
		else if (typeof tf.from === 'function') fct = promised(tf.from)
		else fct = promised(<(...args: T) => R>new Function(tf.params.join(', '), `return ${tf.body}`))
		rv = !tf.fromQSEntry
			? <(...args: T) => Promise<R>>fct
			: //We assume T = [BaseLinqQSEntry]
				<(...args: T) => Promise<R>>(<unknown>(async (sqEntry: Record<string, any>) => {
					async function callIfNeeded(arg: any) {
						if (typeof arg !== 'function') return arg
						const { params } = analyzeLambda(arg)
						const args = params.map((p) => sqEntry[p])
						return arg(...args)
					}
					const args = <T>await Promise.all(
						tf.params.map(async (p) =>
							// if linxArgName is used, tf.args should be defined
							p === linxArgName ? await Promise.all(tf.args!.map(callIfNeeded)) : sqEntry[p]
						)
					)
					return fct(...args)
				}))
		fctCache.set(<TransmissibleFunction<any>>tf, rv)
	}

	return rv
}

export function constant<R>(transmissible: Transmissible<R>): R {
	const tf = cachedTransmissibleFunction(transmissible)
	if (!tf.constant) throw new Error(`Constant expected: ${tf.body}`)
	return tf.constant
}

//#endregion
