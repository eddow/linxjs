import { Hardcodable } from './parser'

export type Primitive = string | number | boolean
export type Numeric<T = any> = (item: T) => number
export type Comparable<T = any> = (item: T) => Primitive

export interface LinqCollection<T = any> extends AsyncIterable<T> {
	/*
	count(): Promise<number>
	sum(numeric?: Numeric<T>): Promise<number>
	average(numeric?: Numeric<T>): Promise<number>
	min(comparable?: Comparable<T>): Promise<T>
	max(comparable?: Comparable<T>): Promise<T>
	aggregate<R>(seed: R, fct: (seed: R, item: T) => R): Promise<R>

	all(fct: (item: T) => boolean): Promise<boolean>
	any(fct: (item: T) => boolean): Promise<boolean>

	contains(item: T): Promise<boolean>

	first(predicate?: (item: T) => boolean): Promise<T>
	firstOrDefault(defaultValue: T, predicate?: (item: T) => boolean): Promise<T>
	last(predicate?: (item: T) => boolean): Promise<T>
	lastOrDefault(defaultValue: T, predicate?: (item: T) => boolean): Promise<T>
	single(predicate?: (item: T) => boolean): Promise<T>
	singleOrDefault(defaultValue: T): Promise<T>
	singleOrDefault(predicate: (item: T) => boolean, defaultValue: T): Promise<T>
	take(n: number): LinqCollection<T>
	takeWhile(predicate: (item: T) => boolean): LinqCollection<T>
	takeLast(n: number): LinqCollection<T>
	takeLastWhile(predicate: (item: T) => boolean): LinqCollection<T>
	skip(n: number): LinqCollection<T>
	skipWhile(predicate: (item: T) => boolean): LinqCollection<T>

	defaultIfEmpty(defaultValue: T): LinqCollection<T>
	distinct(comparer: (itemA: T, itemB: T) => boolean): LinqCollection<T>
	distinctBy(by: (item: T) => any): LinqCollection<T>

	append(...items: T[]): LinqCollection<T>
	prepend(...items: T[]): LinqCollection<T>
	union(other: Iterable<T>): LinqCollection<T>
	concat(other: Iterable<T>): LinqCollection<T>
	intersect(other: Iterable<T>): LinqCollection<T>
	except(other: Iterable<T>): LinqCollection<T>*/

	toArray(): Promise<T[]>
}

export class SemanticError extends Error {
	constructor(code: string, parent?: Error) {
		super(`Unparsable code: ${code}`)
	}
}

export interface Group<T = any> extends LinqCollection<T> {
	key: Primitive
}

export interface TransmissibleFunction extends Function {
	jsCode: string
	values?: any[]
}

export function keyedGroup<T = any>(key: Primitive, value: LinqCollection<T>): Group<T> {
	return Object.assign(value, { key })
}

function transmissibleFunction(
	fct: Function,
	jsCode: string,
	values?: any[]
): TransmissibleFunction {
	return Object.assign(fct, values ? { jsCode, values } : { jsCode })
}

export const linxArgName = '$args$linx$',
	linxArguments = new RegExp(`${linxArgName.replace(/\$/g, '\\$')}\\[(\\d+)\\]`, 'g')

export function makeFunction<T = any>(
	iv: Hardcodable<Function>,
	variables: string[]
): TransmissibleFunction {
	if (typeof iv === 'function')
		return transmissibleFunction((args: any[]) => iv(...args), iv.toString())
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

export const ai = {
	async *map<T = any, R = any>(
		asyncIterable: AsyncIterable<T>,
		fct: (item: T) => R
	): AsyncIterable<R> {
		for await (const item of asyncIterable) yield fct(item)
	}
}
