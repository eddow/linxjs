import type { LinqCollection } from './collection'
import {
	BaseLinqEntry,
	BaseLinqQSEntry,
	Comparable,
	InlineValue,
	OrderSpec,
	Predicate,
	SemanticError,
	Transmissible,
	TransmissibleFunction,
	unwrap
} from './value'

export abstract class Transformation<
	T extends BaseLinqEntry = BaseLinqEntry,
	R extends BaseLinqEntry = BaseLinqEntry
> {
	newVariables(already?: string[]): string[] {
		if (!already) throw new SemanticError(`${this.constructor.name} needs given already variables`)
		return <string[]>already
	}
	abstract transform(enumerable: LinqCollection<T>): LinqCollection<R>
}

export class FromTransformation<
	T extends BaseLinqEntry = BaseLinqEntry,
	O extends BaseLinqEntry = BaseLinqEntry,
	R extends BaseLinqQSEntry = BaseLinqQSEntry
> extends Transformation<T, R> {
	constructor(
		public from: string,
		public source: TransmissibleFunction<LinqCollection<O>, [T]>
	) {
		super()
	}
	newVariables(already?: string[]) {
		return already ? [...already, this.from] : [this.from]
	}
	transform(enumerable: LinqCollection<T>): LinqCollection<R> {
		return enumerable.multiplyBy<O, R>(this.source, this.from)
	}
}

export class WhereTransformation<
	T extends BaseLinqQSEntry = BaseLinqQSEntry
> extends Transformation<T, T> {
	constructor(public predicate: Predicate<T>) {
		super()
	}
	transform(enumerable: LinqCollection<T>): LinqCollection<T> {
		return enumerable.where(this.predicate)
	}
}

export class LetTransformation<
	T extends BaseLinqQSEntry = BaseLinqQSEntry,
	O extends BaseLinqEntry = BaseLinqEntry,
	R extends BaseLinqQSEntry = BaseLinqQSEntry
> extends Transformation {
	constructor(
		public variable: string,
		public value: TransmissibleFunction<O, [T]>
	) {
		super()
	}
	newVariables(already: string[]) {
		return [...already, this.variable]
	}
	transform(enumerable: LinqCollection<T>) {
		return enumerable.let<O, R>(this.value, this.variable)
	}
}

export class SelectTransformation<
	T extends BaseLinqQSEntry,
	R extends BaseLinqQSEntry
> extends Transformation {
	constructor(
		public value: TransmissibleFunction<R, [T]>,
		public into: string = ''
	) {
		super()
	}

	transform(enumerable: LinqCollection<T>) {
		return enumerable.select<R>(this.value).wrap(this.into)
	}
}

export class OrderbyTransformation<T extends BaseLinqQSEntry> extends Transformation {
	constructor(public orders: OrderSpec[]) {
		super()
	}

	transform(enumerable: LinqCollection<T>) {
		return enumerable.order(...this.orders)
	}
}

export class JoinTransformation<
	T extends BaseLinqQSEntry,
	I extends BaseLinqEntry,
	R extends BaseLinqQSEntry
> extends Transformation {
	constructor(
		public from: string,
		public source: Transmissible<LinqCollection<I>, [T]>,
		public outerSelector: Comparable<T>,
		public innerSelector: Comparable<I>,
		public into?: string
	) {
		super()
	}
	newVariables(already?: string[]) {
		if (!already) throw new SemanticError(`${this.constructor.name} needs given already variables`)
		return [...already, this.into || this.from]
	}
	transform(enumerable: LinqCollection<T>) {
		if (this.into)
			return enumerable.groupJoin<I, R>(
				this.source,
				this.outerSelector,
				this.innerSelector,
				this.into,
				this.from
			)
		return enumerable.join<I, R>(
			this.source,
			this.outerSelector,
			this.innerSelector,
			this.from,
			this.from
		)
	}
}

export class GroupTransformation<
	T extends BaseLinqQSEntry,
	R extends BaseLinqQSEntry
> extends Transformation {
	constructor(
		public singleVariable: string | undefined,
		public value: TransmissibleFunction<R, [T]> | undefined,
		public key: Comparable<T>,
		public into: string = ''
	) {
		super()
	}
	newVariables() {
		return this.into ? [this.into] : []
	}

	transform(enumerable: LinqCollection<T>) {
		if (!(this.singleVariable || this.value))
			throw new SemanticError(
				'`group by` without value can only be used on a single variable collection '
			)
		return enumerable
			.groupBy<R>(
				this.key,
				this.value ||
					// `group by` => `group X by` where X is the single variable
					new TransmissibleFunction(new InlineValue(undefined, [this.singleVariable]), [
						this.singleVariable
					])
			)
			.wrap(this.into)
	}
}

// TODO: Templates -> remove as many `any` as possible
