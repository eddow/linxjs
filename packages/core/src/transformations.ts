import { SemanticError } from './internals'
import type { Hardcodable, InlineValue } from './parser'

export class Transformation {
	newVariables(already?: string[]): string[] {
		if (!already) throw new SemanticError(`${this.constructor.name} needs given already variables`)
		return <string[]>already
	}
}

export class FromTransformation<T = any> extends Transformation {
	constructor(
		public from: string,
		public source: Hardcodable<AsyncIterable<T>>
	) {
		super()
	}
	newVariables(already?: string[]) {
		return already ? [...already, this.from] : [this.from]
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
	newVariables(already: string[]) {
		return [...already, this.variable]
	}
}

export class JoinTransformation<T = any> extends Transformation {
	constructor(
		public from: string,
		public source: AsyncIterable<T>,
		public valueA: InlineValue,
		public valueB: InlineValue,
		public into?: string
	) {
		super()
	}
	newVariables(already?: string[]) {
		if (!already) throw new SemanticError(`${this.constructor.name} needs given already variables`)
		return [...already, this.into || this.from]
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
}

/* TODO:
Aggregation methods (e.g., Any, All, Count, Sum, Average, Min, Max)
Take / Skip for pagination
*/

// TODO: Templates -> remove as many `any` as possible
