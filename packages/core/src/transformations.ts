import {
	BaseLinqEntry,
	BaseLinqQSEntry,
	Collector,
	Group,
	LinqCollection,
	makeFunction,
	orderFunction,
	Primitive,
	SemanticError
} from './internals'
import type { OrderSpec, Hardcodable, InlineValue } from './parser'

export abstract class Transformation {
	newVariables(already?: string[]): string[] {
		if (!already) throw new SemanticError(`${this.constructor.name} needs given already variables`)
		return <string[]>already
	}
	abstract transform(
		enumerable: LinqCollection<any>,
		variables: string[],
		collector: Collector
	): LinqCollection<any>
}

export class FromTransformation<O extends BaseLinqEntry> extends Transformation {
	constructor(
		public from: string,
		public source: any
	) {
		super()
	}
	newVariables(already?: string[]) {
		return already ? [...already, this.from] : [this.from]
	}
	transform<T extends BaseLinqQSEntry>(
		enumerable: LinqCollection<T>,
		variables: string[],
		collector: Collector
	): LinqCollection<[...T, O]> {
		const otherFct = makeFunction<T, O>(this.source, variables)
		return enumerable.multiplyBy<O, [...T, O]>(
			(e) => collector<O>(otherFct(e)),
			(t, o) => [...t, o]
		)
	}
}

export class WhereTransformation extends Transformation {
	constructor(public predicate: InlineValue) {
		super()
	}
	transform<T extends BaseLinqQSEntry>(
		enumerable: LinqCollection<T>,
		variables: string[]
	): LinqCollection<T> {
		const predicateFct = makeFunction<T, boolean>(this.predicate, variables)
		return enumerable.where((item: T) => predicateFct(item))
	}
}

export class LetTransformation extends Transformation {
	constructor(
		public variable: string,
		public value: InlineValue
	) {
		super()
	}
	newVariables(already: string[]) {
		return [...already, this.variable]
	}
	transform<T extends BaseLinqQSEntry, R extends BaseLinqEntry>(
		enumerable: LinqCollection<T>,
		variables: string[]
	) {
		const generateFct = makeFunction<T, R>(this.value, variables)
		return enumerable.select<[...T, R]>((item) => [...item, generateFct(item)])
	}
}

export class SelectTransformation extends Transformation {
	constructor(
		public value: Hardcodable<Function>,
		public into?: string | false
	) {
		super()
	}

	newVariables() {
		return this.into ? [this.into] : []
	}

	transform<T extends BaseLinqQSEntry, R>(enumerable: LinqCollection<T>, variables: string[]) {
		const generateFct = makeFunction<T, R>(this.value, variables)
		return enumerable.select<[R]>((item) => [generateFct(item)])
	}
}

export class OrderbyTransformation extends Transformation {
	constructor(public orders: OrderSpec[]) {
		super()
	}

	transform<T extends BaseLinqQSEntry>(enumerable: LinqCollection<T>, variables: string[]) {
		return enumerable.order(
			...this.orders.map(({ value, way }) => orderFunction(makeFunction(value, variables), way))
		)
	}
}

export class JoinTransformation<T = any> extends Transformation {
	constructor(
		public from: string,
		public source: any,
		public outerSelector: Hardcodable<Function>,
		public innerSelector: Hardcodable<Function>,
		public into?: string
	) {
		super()
	}
	newVariables(already?: string[]) {
		if (!already) throw new SemanticError(`${this.constructor.name} needs given already variables`)
		return [...already, this.into || this.from]
	}
	transform<T extends BaseLinqQSEntry, I extends BaseLinqEntry>(
		enumerable: LinqCollection<T>,
		variables: string[],
		collector: Collector
	) {
		const outerSelectorFct = makeFunction<T, Primitive>(this.outerSelector, variables),
			innerSelectorFct = makeFunction<[I], Primitive>(this.innerSelector, [this.from]),
			innerSelectorSingleFct = (i: I) => innerSelectorFct([i]),
			source = collector<I>(this.source)
		if (this.into)
			return enumerable.groupJoin<I, [...T, I[]]>(
				source,
				outerSelectorFct,
				innerSelectorSingleFct,
				(outer: T, inner: I[]) => [...outer, inner]
			)
		return enumerable.join<I, [...T, I]>(
			source,
			outerSelectorFct,
			innerSelectorSingleFct,
			(outer: T, inner: I) => [...outer, inner]
		)
	}
}

export class GroupTransformation extends Transformation {
	constructor(
		public value: Hardcodable<Function>,
		public key: Hardcodable<Function>,
		public into?: string | false
	) {
		super()
	}
	newVariables() {
		return this.into ? [this.into] : []
	}
	transform<T extends BaseLinqQSEntry, R extends BaseLinqEntry>(
		enumerable: LinqCollection<T>,
		variables: string[]
	) {
		const generateFct = makeFunction<T, R>(this.value, variables),
			keyFct = makeFunction<T, Primitive>(this.key, variables)
		return enumerable.groupBy<R>(keyFct, generateFct).select<[Group<R>]>((v) => [v])
	}
}

// TODO: Templates -> remove as many `any` as possible
