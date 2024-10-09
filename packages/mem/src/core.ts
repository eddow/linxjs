import { LinqCollection } from '@linxjs/core'

class PromisedIterator<T> implements AsyncIterator<T> {
	constructor(private it: Iterator<T>) {}
	async next(): Promise<IteratorResult<T>> {
		return this.it.next()
	}
	async return(): Promise<IteratorResult<T>> {
		return this.it.return()
	}
	async throw(e: any): Promise<IteratorResult<T>> {
		return this.it.throw(e)
	}
}

class PromisedIterable<T> implements AsyncIterable<T> {
	constructor(private it: Iterable<T>) {}
	[Symbol.asyncIterator](): AsyncIterator<T> {
		return new PromisedIterator(this.it[Symbol.iterator]())
	}
}

export async function toArray<T = any>(enumerable: AsyncIterable<T>): Promise<T[]> {
	const rv = []
	for await (const v of enumerable) rv.push(v)
	return rv
}

export class MemCollection<T = any> implements LinqCollection<T> {
	private enumerable: AsyncIterable<T>
	constructor(enumerable: AsyncIterable<T> | Iterable<T>) {
		if ((<AsyncIterable<T>>enumerable)[Symbol.asyncIterator])
			this.enumerable = <AsyncIterable<T>>enumerable
		else if ((<Iterable<T>>enumerable)[Symbol.iterator])
			this.enumerable = new PromisedIterable(<Iterable<T>>enumerable)
	}
	[Symbol.asyncIterator](): AsyncIterator<T> {
		return this.enumerable[Symbol.asyncIterator]()
	}

	async toArray(): Promise<T[]> {
		return toArray(this.enumerable)
	}
}
