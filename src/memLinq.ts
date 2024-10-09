import { keyedGroup, makeFunction, SemanticError } from './internals'
import { InlineValue, Parsed } from './parser'
import {
	FromTransformation,
	GroupTransformation,
	JoinTransformation,
	LetTransformation,
	OrderbyTransformation,
	WhereTransformation
} from './transformations'

type PartialResultGenerator<T = any> = Generator<T[], any, any>

function keySort(a: { key: any }, b: { key: any }) {
	return a.key < b.key ? -1 : a.key > b.key ? 1 : 0
}

const transform = {
	*FromTransformation(
		enumerable: PartialResultGenerator<any>,
		variables: string[],
		{ source }: FromTransformation
	) {
		if (!variables && (typeof source === 'function' || (<InlineValue>source).strings))
			throw new SemanticError('First source must be given explicitly, not as a function')
		const inlineVSource = <InlineValue>source,
			genSource =
				inlineVSource.strings && inlineVSource.args
					? makeFunction(inlineVSource, variables)
					: source
		if (!variables) for (const v of <PartialResultGenerator>genSource) yield [v]
		else {
			if (typeof genSource === 'function')
				for (const itm of enumerable) {
					for (const v of genSource(itm)) yield [...itm, v]
				}
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
		if (!sortedPartial || !sortedSource)
			throw new SemanticError('Join equality must be between two tables')
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
	},
	*GroupTransformation(
		enumerable: PartialResultGenerator<any>,
		variables: string[],
		{ value, key, into }: GroupTransformation
	) {
		const fctValue = makeFunction(value, variables),
			fctKey = makeFunction(key, variables)
		const group = new Map<any, any[]>()
		for (const v of enumerable) {
			const key = fctKey(v)
			if (!group.has(key)) group.set(key, [])
			group.get(key)!.push(fctValue(v))
		}
		for (const [key, value] of group) {
			yield [keyedGroup(key, value)]
		}
	}
}

export default function* memLinq({ transformations, selection }: Parsed): any {
	let enumerable = <any[]>[],
		variables: string[] | undefined = undefined
	for (const transformation of transformations) {
		enumerable = transform[transformation.constructor.name](enumerable, variables, transformation)
		variables = transformation.newVariables(variables)
	}
	if (!variables) throw new SemanticError('Nothing to select from')
	if (selection) {
		const selectFct = makeFunction(selection, variables)
		for (const v of enumerable) yield selectFct(v)
	} else
		for (const v of enumerable) {
			yield v[0]
		}
}
