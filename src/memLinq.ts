import { InlineValue, Parsed } from './parser'
import {
	FromTransformation,
	JoinTransformation,
	LetTransformation,
	OrderbyTransformation,
	WhereTransformation
} from './transformations'

type PartialResultGenerator<T = any> = Generator<T[], any, any>

export class JSSyntaxError extends Error {
	constructor(code: string, parent?: Error) {
		super(`Unparsable code: ${code}`)
	}
}

const linxArgName = '$args$linx$'

function makeFunction(iv: InlineValue | Function, variables: string[]) {
	if (typeof iv === 'function') return (args: any[]) => iv(...args)
	console.assert([iv.args.length, iv.args.length + 1].includes(iv.strings.length))
	if (iv.args.length) {
		const ivStrings = [...iv.strings],
			[strings, last] =
				iv.strings.length > iv.args.length ? [ivStrings, ivStrings.pop()] : [ivStrings, ''],
			fct = new Function(
				[linxArgName, ...variables].join(','),
				'return ' + strings.map((s, i) => `${s} ${linxArgName}[${i}]`).join('') + last
			)
		return (args: any[]) =>
			fct(
				iv.args.map((iva) => (typeof iva === 'function' ? iva(...args) : iva)),
				...args
			)
	}
	const value = iv.strings[0]
	try {
		const fct = new Function(variables.join(','), `return ${value}`)
		return (args: any[]) => fct(...args)
	} catch (e) {
		throw new JSSyntaxError(value, e)
	}
}

function keySort(a: { key: any }, b: { key: any }) {
	return a.key < b.key ? -1 : a.key > b.key ? 1 : 0
}

const transform = {
	*FromTransformation(
		enumerable: PartialResultGenerator<any>,
		variables: string[],
		{ source }: FromTransformation
	) {
		const inlineVSource = <InlineValue>source,
			genSource =
				inlineVSource.strings && inlineVSource.args
					? makeFunction(inlineVSource, variables)
					: source
		if (!variables.length) {
			if (typeof genSource === 'function')
				throw new JSSyntaxError('First source must be given explicitly, not as a function')
			for (const v of <PartialResultGenerator>genSource) yield [v]
		} else {
			if (typeof genSource === 'function')
				// TODO test me
				for (const itm of enumerable) for (const v of genSource.apply(null, itm)) yield [...itm, v]
			else {
				const tableSource = [...(<PartialResultGenerator>genSource)]
				for (const itm of enumerable) for (const v of tableSource) yield [...itm, v]
			}
		}
	},
	*WhereTransformation(
		enumerable: PartialResultGenerator<any>,
		variables: string[],
		{ predicate }: WhereTransformation
	) {
		const predicateFct = makeFunction(predicate, variables)
		for (const itm of enumerable) if (predicateFct(itm)) yield itm
	},
	*OrderbyTransformation(
		enumerable: PartialResultGenerator<any>,
		variables: string[],
		{ orders }: OrderbyTransformation
	) {
		const fctOrders = orders.map(({ value, asc }) => ({
			fct: makeFunction(value, variables),
			asc
		}))
		yield* [...enumerable].sort((a, b) => {
			for (const { fct, asc } of fctOrders) {
				const aVal = fct(a),
					bVal = fct(b)

				if (aVal === bVal) continue
				return aVal < bVal === asc ? -1 : 1
			}
			return 0
		})
	},
	*LetTransformation(
		enumerable: PartialResultGenerator<any>,
		variables: string[],
		{ value }: LetTransformation
	) {
		const fct = makeFunction(value, variables)
		for (const v of enumerable) yield [...v, fct(v)]
	},
	*JoinTransformation(
		enumerable: PartialResultGenerator<any>,
		variables: string[],
		{ from, source, valueA, valueB, into }: JoinTransformation
	) {
		const genSource = source,
			tablePartial = [...enumerable],
			tableSource = [...genSource]
		let sortedPartial: { key: any; value: any }[] | undefined,
			sortedSource: { key: any; value: any }[] | undefined

		try {
			const fctPartial = makeFunction(valueA, variables),
				fctSource = makeFunction(valueB, [from])
			sortedPartial = tablePartial.map((p) => ({ key: fctPartial(p), value: p })).sort(keySort)
			sortedSource = tableSource.map((s) => ({ key: fctSource([s]), value: s })).sort(keySort)
		} catch (e) {
			try {
				const fctPartial = makeFunction(valueB, variables),
					fctSource = makeFunction(valueA, [from])
				sortedPartial = tablePartial.map((p) => ({ key: fctPartial(p), value: p })).sort(keySort)
				sortedSource = tableSource.map((s) => ({ key: fctSource([s]), value: s })).sort(keySort)
			} catch (e) {}
		}
		if (sortedPartial && sortedSource) {
			let pi = 0,
				si = 0
			while (pi < sortedPartial.length && si < sortedSource.length) {
				if (sortedPartial[pi].key < sortedSource[si].key) pi++
				else if (sortedPartial[pi].key > sortedSource[si].key) si++
				else {
					const key = sortedPartial[pi].key,
						factorP: any[] = [],
						factorS: any[] = []
					for (; pi < sortedPartial.length && sortedPartial[pi].key === key; pi++)
						factorP.push(sortedPartial[pi].value)
					for (; si < sortedSource.length && sortedSource[si].key === key; si++)
						factorS.push(sortedSource[si].value)
					if (into) for (const p of factorP) yield [...p, factorS]
					else for (const p of factorP) for (const s of factorS) yield [...p, s]
				}
			}
		} else {
			// Note: shouldn't come here as `equals` is compulsory but it was written so we can let it "in the case of"
			const allVars = [...variables, from],
				fctA = makeFunction(valueA, allVars),
				fctB = valueB ? makeFunction(valueB, allVars) : null,
				fct = fctB ? (v: any[]) => fctA(v) === fctB(v) : fctA
			if (into)
				for (const elmA of tablePartial) {
					const paired: any[] = []
					for (const elmB of tableSource) {
						const joined = [...elmA, elmB]
						if (fct(joined)) paired.push(elmB)
					}
					yield [...elmA, paired]
				}
			else
				for (const elmA of tablePartial) {
					for (const elmB of tableSource) {
						const joined = [...elmA, elmB]
						if (fct(joined)) yield joined
					}
				}
		}
	}
}

export default function* memLinq({ transformations, selection }: Parsed): any {
	let enumerable = (function* (): PartialResultGenerator<any> {})(),
		variables: string[] = []
	for (const transformation of transformations) {
		enumerable = transform[transformation.constructor.name](enumerable, variables, transformation)
		variables = [...variables, ...transformation.variables]
	}

	if (selection) {
		const selectFct = makeFunction(selection, variables)
		for (const v of enumerable) yield selectFct(v)
	} else for (const v of enumerable) yield v[0] // TODO reduce: all props?
}
