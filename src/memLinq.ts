import { InlineValue, Parsed } from './parser'
import {
	JoinTransformation,
	LetTransformation,
	OrderbyTransformation,
	WhereTransformation
} from './transformations'

export class JSSyntaxError extends Error {
	constructor(code: string, parent: Error) {
		super(`Unparsable code: ${code}`)
	}
}

interface Partial<T = any> {
	enumerable: Generator<T>
	variables: string[]
}

function makeFunction(iv: InlineValue | Function, variables: string[]) {
	let fct: Function
	if (typeof iv === 'function') fct = iv
	else {
		const value = iv.strings.map((s, i) => (i < iv.args.length ? `${s}${iv.args[i]}` : s)).join()

		try {
			fct = new Function(variables.join(','), `return ${value}`)
		} catch (e) {
			throw new JSSyntaxError(value, e)
		}
	}
	return function (v: any[]) {
		return fct(...v)
	}
}

function keySort(a: { key: any }, b: { key: any }) {
	return a.key < b.key ? -1 : a.key > b.key ? 1 : 0
}

const transform = {
	*WhereTransformation(
		enumerable: Generator<any>,
		variables: string[],
		{ predicate }: WhereTransformation
	) {
		const predicateFct = makeFunction(predicate, variables)
		for (const itm of enumerable) if (predicateFct(itm)) yield itm
	},
	*OrderbyTransformation(
		enumerable: Generator<any>,
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
		enumerable: Generator<any>,
		variables: string[],
		{ variable, value }: LetTransformation
	) {
		const fct = makeFunction(value, variables)
		for (const v of enumerable) yield [...v, fct(v)]
	},
	*JoinTransformation(
		enumerable: Generator<any>,
		variables: string[],
		{ from, source, valueA, valueB, into }: JoinTransformation
	) {
		const genSource = <Generator<any>>source // TODO case when a name is given -> InlineValue
		// When possible, try to make it faster by sorting both entries (`partial array` and `source`)
		// and browsing with 2 indexes => O(n1+n2)
		let fctPartial: Function | undefined, fctSource: Function | undefined
		try {
			fctPartial = makeFunction(valueA, variables)
			fctSource = makeFunction(valueB, [from])
		} catch (e) {
			try {
				fctPartial = makeFunction(valueB, [from])
				fctSource = makeFunction(valueA, variables)
			} catch (e) {}
		}
		if (fctPartial && fctSource) {
			const tableP = [...enumerable].map((p) => ({ key: fctPartial(p), value: p })).sort(keySort),
				tableS = [...genSource].map((s) => ({ key: fctSource([s]), value: s })).sort(keySort)

			let pi = 0,
				si = 0
			while (pi < tableP.length && si < tableS.length) {
				if (tableP[pi].key < tableS[si].key) pi++
				else if (tableP[pi].key > tableS[si].key) si++
				else {
					const key = tableP[pi].key,
						factorP: any[] = [],
						factorS: any[] = []
					for (; pi < tableP.length && tableP[pi].key === key; pi++) factorP.push(tableP[pi].value)
					for (; si < tableS.length && tableS[si].key === key; si++) factorS.push(tableS[si].value)
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
				for (const elmA of enumerable) {
					const paired: any[] = []
					for (const elmB of genSource) {
						const joined = [...elmA, elmB]
						if (fct(joined)) paired.push(elmB)
					}
					yield [...elmA, paired]
				}
			else
				for (const elmA of enumerable) {
					for (const elmB of genSource) {
						const joined = [...elmA, elmB]
						if (fct(joined)) yield joined
					}
				}
		}
	}
}

export default function* memLinq({ from, source, transformations, select }: Parsed): any {
	let enumerable = source.map((v) => [v])
	let variables = [from]
	for (const transformation of transformations) {
		enumerable = transform[transformation.constructor.name](enumerable, variables, transformation)
		variables = [...variables, ...transformation.variables]
	}

	if (select) {
		const selectFct = makeFunction(select, variables)
		for (const v of enumerable) yield selectFct(v)
	} else for (const v of enumerable) yield v[0]
}
