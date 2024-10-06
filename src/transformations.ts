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

/* TODO:
	group
	join
	let
Distinct
Aggregation methods (e.g., Any, All, Count, Sum, Average, Min, Max)
Take / Skip for pagination
*/
