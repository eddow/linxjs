import { InlineValue, Parsed } from './parser'
import { LetTransformation, OrderbyTransformation, WhereTransformation } from './transformations'

export class JSSyntaxError extends Error {
	constructor(code: string, parent: Error) {
		super(`Unparsable code: ${code}`)
	}
}

function makeFunction(iv: InlineValue | Function) {
	let fct: Function
	if (typeof iv === 'function') fct = iv
	else {
		const value = iv.strings.map((s, i) => (i < iv.args.length ? `${s}${iv.args[i]}` : s)).join()

		try {
			fct = new Function(iv.from.join(','), `return ${value}`)
		} catch (e) {
			throw new JSSyntaxError(value, e)
		}
	}
	return function (v: any[]) {
		return fct.apply(null, v)
	}
}

const transform = {
	WhereTransformation(partial, transformation) {
		return partial.filter(makeFunction(transformation.predicate))
	},
	OrderbyTransformation(partial, transformation) {
		const orders = transformation.orders.map(({ value, asc }) => ({
			fct: makeFunction(value),
			asc
		}))
		return partial.sort((a, b) => {
			for (const { fct, asc } of orders) {
				const aVal = fct(a),
					bVal = fct(b)

				if (aVal === bVal) continue
				return aVal < bVal === asc ? -1 : 1
			}
			return 0
		})
	},
	LetTransformation(partial, transformation) {
		const fct = makeFunction(transformation.value)
		return partial.map((v) => [...v, fct(v)])
	}
}

export default function memLinq({ source, transformations, select }: Parsed): any {
	let partial = source.map((v) => [v])
	for (const transformation of transformations)
		partial = transform[transformation.constructor.name](partial, transformation)

	if (select) {
		return partial.map(makeFunction(select))
	} else {
		return partial.map((v) => v[0])
	}
}
