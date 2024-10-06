import linq, { memLinq } from '../src'

const l = linq(memLinq)

describe('standard', () => {
	test('where', () => {
		const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
		const rv = l`from n in ${numbers} where ${(n) => n % 2 === 0}`
		debugger
		expect([...l`from n in ${numbers} where ${(n) => n % 2 === 0}`]).toEqual([2, 4, 6, 8, 10])
		expect([...l`from n in ${numbers} where n % 2 === 0`]).toEqual([2, 4, 6, 8, 10])
	})
	test('select', () => {
		const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
		expect([...l`from n in ${numbers} where n % 2 === 0 select ${(n) => n + 1}`]).toEqual([
			3, 5, 7, 9, 11
		])
		expect([...l`from n in ${numbers} where n % 2 === 0 select n + 1`]).toEqual([3, 5, 7, 9, 11])
	})
	test('orderby', () => {
		const numbers = [1, 10, 2, 9, 3, 8, 4, 7, 5, 6]
		expect([...l`from n in ${numbers} orderby n`]).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
		expect([...l`from n in ${numbers} orderby -n ascending`]).toEqual([
			10, 9, 8, 7, 6, 5, 4, 3, 2, 1
		])
		expect([...l`from n in ${numbers} orderby n descending`]).toEqual([
			10, 9, 8, 7, 6, 5, 4, 3, 2, 1
		])
	})
	test('let', () => {
		const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
		expect([...l`from n in ${numbers} let x = n * 2 select x`]).toEqual([
			2, 4, 6, 8, 10, 12, 14, 16, 18, 20
		])
	})
	test('join', () => {
		const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
		expect([...l`from n in ${numbers} join m in ${numbers} on n equals m select n + m`]).toEqual([
			2, 4, 6, 8, 10, 12, 14, 16, 18, 20
		])
	})
	test('from join', () => {
		const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
		expect([...l`from n in ${numbers} from m in ${numbers} where m === n select n + m`]).toEqual([
			2, 4, 6, 8, 10, 12, 14, 16, 18, 20
		])
	})
	test('join into', () => {
		const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
		expect([
			...l`from n in ${numbers} join m in ${numbers} on n equals m into nm select {n, nm}`
		]).toEqual([
			{ n: 1, nm: [1] },
			{ n: 2, nm: [2] },
			{ n: 3, nm: [3] },
			{ n: 4, nm: [4] },
			{ n: 5, nm: [5] },
			{ n: 6, nm: [6] },
			{ n: 7, nm: [7] },
			{ n: 8, nm: [8] },
			{ n: 9, nm: [9] },
			{ n: 10, nm: [10] }
		])
	})

	/*test('from join into', () => {
		const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
		expect([
			...l`from n in ${numbers} from m in ${numbers} where n > m select {n, nm}`
		]).toEqual([
			{ n: 1, nm: [] },
			{ n: 2, nm: [1] },
			{ n: 3, nm: [1, 2] },
			{ n: 4, nm: [1, 2, 3] },
			{ n: 5, nm: [1, 2, 3, 4] },
			{ n: 6, nm: [1, 2, 3, 4, 5] },
			{ n: 7, nm: [1, 2, 3, 4, 5, 6] },
			{ n: 8, nm: [1, 2, 3, 4, 5, 6, 7] },
			{ n: 9, nm: [1, 2, 3, 4, 5, 6, 7, 8] },
			{ n: 10, nm: [1, 2, 3, 4, 5, 6, 7, 8, 9] }
		])
	})*/
})
