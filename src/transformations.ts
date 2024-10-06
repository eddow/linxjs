import type { Hardcodable, InlineValue } from './parser'

export class Transformation {
	get variables() {
		return <string[]>[]
	}
}

export class WhereTransformation extends Transformation {
	constructor(public predicate: InlineValue) {
		super()
	}
}

export interface OrderSpec {
	value: InlineValue
	asc: boolean
}

export class OrderbyTransformation extends Transformation {
	constructor(public orders: OrderSpec[]) {
		super()
	}
}

export class LetTransformation extends Transformation {
	constructor(
		public variable: string,
		public value: InlineValue
	) {
		super()
	}
	get variables() {
		return [this.variable]
	}
}

export class JoinTransformation<T = any> extends Transformation {
	constructor(
		public from: string,
		public source: Hardcodable<Generator<T>>,
		public valueA: InlineValue,
		public valueB: InlineValue,
		public into?: string
	) {
		super()
	}
	get variables() {
		return [this.into || this.from]
	}
}

/* TODO:
	group
	join ... into ...
Distinct
Aggregation methods (e.g., Any, All, Count, Sum, Average, Min, Max)
Take / Skip for pagination
*/

// TODO: Templates -> virer les `any`
