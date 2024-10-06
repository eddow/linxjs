import linq, { memLinq } from '../src'

const from = linq(memLinq)

describe('standard', () => {
	test('where', () => {
		const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
		expect(from`n in ${numbers} where ${(n) => n % 2 === 0}`).toEqual([2, 4, 6, 8, 10])
		expect(from`n in ${numbers} where n % 2 === 0`).toEqual([2, 4, 6, 8, 10])
	})
	test('select', () => {
		const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
		expect(from`n in ${numbers} where n % 2 === 0 select ${(n) => n + 1}`).toEqual([3, 5, 7, 9, 11])
		expect(from`n in ${numbers} where n % 2 === 0 select n + 1`).toEqual([3, 5, 7, 9, 11])
	})
	test('orderby', () => {
		const numbers = [1, 10, 2, 9, 3, 8, 4, 7, 5, 6]
		expect(from`n in ${numbers} orderby n`).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
		expect(from`n in ${numbers} orderby -n ascending`).toEqual([10, 9, 8, 7, 6, 5, 4, 3, 2, 1])
		expect(from`n in ${numbers} orderby n descending`).toEqual([10, 9, 8, 7, 6, 5, 4, 3, 2, 1])
	})
	test('let', () => {
		const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
		expect(from`n in ${numbers} let x = n * 2 select x`).toEqual([
			2, 4, 6, 8, 10, 12, 14, 16, 18, 20
		])
	})
})
