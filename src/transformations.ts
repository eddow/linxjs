import type { InlineValue } from './parser'

export class Transformation {}

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
}

export class JoinTransformation extends Transformation {
	constructor(
		public from: string,
		public source: any,
		public valueA: InlineValue,
		public valueB?: InlineValue
	) {
		super()
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
