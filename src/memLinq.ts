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
	array: T[]
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
	WhereTransformation({ array, variables }: Partial, { predicate }: WhereTransformation) {
		return { array: array.filter(makeFunction(predicate, variables)), variables }
	},
	OrderbyTransformation({ array, variables }: Partial, { orders }: OrderbyTransformation) {
		const fctOrders = orders.map(({ value, asc }) => ({
			fct: makeFunction(value, variables),
			asc
		}))
		return {
			array: array.sort((a, b) => {
				for (const { fct, asc } of fctOrders) {
					const aVal = fct(a),
						bVal = fct(b)

					if (aVal === bVal) continue
					return aVal < bVal === asc ? -1 : 1
				}
				return 0
			}),
			variables
		}
	},
	LetTransformation({ array, variables }: Partial, { variable, value }: LetTransformation) {
		const allVars = [...variables, variable]
		const fct = makeFunction(value, variables)
		return { array: array.map((v) => [...v, fct(v)]), variables: allVars }
	},
	JoinTransformation(
		{ array, variables }: Partial,
		{ from, source, valueA, valueB }: JoinTransformation
	) {
		const rv: any[] = []
		if (valueB) {
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
				const tableP = array.map((p) => ({ key: fctPartial(p), value: p })).sort(keySort),
					tableS = source.map((s) => ({ key: fctSource([s]), value: s })).sort(keySort)

				let pi = 0,
					si = 0
				while (pi < tableP.length && si < tableS.length) {
					if (tableP[pi].key < tableS[si].key) pi++
					else if (tableP[pi].key > tableS[si].key) si++
					else {
						const key = tableP[pi].key,
							factorP: any[] = []
						for (; pi < tableP.length && tableP[pi].key === key; pi++)
							factorP.push(tableP[pi].value)
						for (; si < tableS.length && tableS[si].key === key; si++)
							rv.push(...factorP.map((p) => [...p, tableS[si].value]))
					}
				}
			}
			return { array: rv, variables: [...variables, from] }
		}
		const allVars = [...variables, ...from],
			fctA = makeFunction(valueA, allVars),
			fctB = valueB ? makeFunction(valueB, allVars) : null,
			fct = fctB ? (v: any[]) => fctA(v) === fctB(v) : fctA
		for (const elmA of array) {
			for (const elmB of source) {
				const joined = [...elmA, elmB]
				if (fct(joined)) {
					rv.push(joined)
				}
			}
		}
		return {
			array: rv,
			variables: allVars
		}
	}
}

export default function memLinq({ from, source, transformations, select }: Parsed): any {
	let partial: Partial = {
		array: source.map((v) => [v]),
		variables: [from]
	}
	for (const transformation of transformations)
		partial = transform[transformation.constructor.name](partial, transformation)

	if (select) {
		return partial.array.map(makeFunction(select, partial.variables))
	} else {
		return partial.array.map((v) => v[0])
	}
}
