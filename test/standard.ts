import { Group, type Linq, SemanticError, SyntaxError } from '@linxjs/core'

export default function (from: Linq) {
	describe('standard', () => {
		test('where', async () => {
			const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
			expect(await from`n in ${numbers} where ${(n: number) => n % 2 === 0}`.toArray()).toEqual([
				2, 4, 6, 8, 10
			])
			expect(await from`n in ${numbers} where n % 2 === 0`.toArray()).toEqual([2, 4, 6, 8, 10])
		})
		test('select', async () => {
			const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
			expect(
				await from`n in ${numbers} where n % 2 === 0 select ${(n: number) => n + 1}`.toArray()
			).toEqual([3, 5, 7, 9, 11])
			expect(await from`n in ${numbers} where n % 2 === 0 select n + 1`.toArray()).toEqual([
				3, 5, 7, 9, 11
			])
		})
		test('compose value', async () => {
			const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
			expect(
				await from`n in ${numbers} where n % 2 === 0 select { n, inc: ${(n: number) => n + 1} }`.toArray()
			).toEqual([
				{ n: 2, inc: 3 },
				{ n: 4, inc: 5 },
				{ n: 6, inc: 7 },
				{ n: 8, inc: 9 },
				{ n: 10, inc: 11 }
			])
		})
		test('order by', async () => {
			const numbers = [1, 10, 2, 9, 3, 8, 4, 7, 5, 6]
			expect(await from`n in ${numbers} order by n`.toArray()).toEqual([
				1, 2, 3, 4, 5, 6, 7, 8, 9, 10
			])
			expect(await from`n in ${numbers} order by -n ascending`.toArray()).toEqual([
				10, 9, 8, 7, 6, 5, 4, 3, 2, 1
			])
			expect(await from`n in ${numbers} order by n descending`.toArray()).toEqual([
				10, 9, 8, 7, 6, 5, 4, 3, 2, 1
			])
		})
		test('let', async () => {
			const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
			expect(await from`n in ${numbers} let x = n * 2 select x`.toArray()).toEqual([
				2, 4, 6, 8, 10, 12, 14, 16, 18, 20
			])
		})
		test('join', async () => {
			const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
			expect(
				await from`n in ${numbers} join m in ${numbers} on n equals m select n + m`.toArray()
			).toEqual([2, 4, 6, 8, 10, 12, 14, 16, 18, 20])
		})
		test('from join', async () => {
			const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
			expect(
				await from`n in ${numbers} from m in ${numbers} where m === n select n + m`.toArray()
			).toEqual([2, 4, 6, 8, 10, 12, 14, 16, 18, 20])
		})
		test('join into', async () => {
			const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
			expect(
				await from`n in ${numbers} join m in ${numbers} on n equals m into nm select {n, nm}`.toArray()
			).toEqual([
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

		test('group by', async () => {
			const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
			expect(
				await from`n in ${numbers} group n by n % 2`
					.select(async (g: Group<number>) => [g.key, await g.toArray()])
					.toArray()
			).toEqual([
				[0, [2, 4, 6, 8, 10]],
				[1, [1, 3, 5, 7, 9]]
			])
			expect(
				await from`n in ${numbers} group by n % 2`
					.select(async (g: Group<number>) => [g.key, await g.toArray()])
					.toArray()
			).toEqual([
				[0, [2, 4, 6, 8, 10]],
				[1, [1, 3, 5, 7, 9]]
			])
		})

		test('SemanticError', async () => {
			expect(await from`n in ${[1, 2]} select n`.toArray()).toEqual([1, 2])
			/*expect(async () => await from`n in ${() => [1, 2]} select n`.toArray()).rejects.toThrow(
				SemanticError
			)*/
			expect(async () => await from`n in boom select n`.toArray()).rejects.toThrow(SemanticError)
			expect(async () => await from`n in ${[1, 2]} select blah`.toArray()).rejects.toThrow(
				ReferenceError
			)
			expect(
				async () =>
					await from`n in ${[1, 2]} join m in ${[1, 2]} on n equals n select m+n`.toArray()
			).rejects.toThrow(ReferenceError)
		})

		test('SyntaxError', async () => {
			expect(async () => await from`n in ${[1, 2]} .`.toArray()).rejects.toThrow(SyntaxError)
			expect(async () => await from`n in ${[1, 2]} let x != n select x`.toArray()).rejects.toThrow(
				SyntaxError
			)
			expect(async () => await from`n in ${[1, 2]} into more`.toArray()).rejects.toThrow(
				SyntaxError
			)
			expect(
				async () => await from`n in ${[1, 2]} select n by something`.toArray()
			).rejects.toThrow(SyntaxError)
			expect(async () => await from`n in ${[1, 2]} join m in [n]`.toArray()).rejects.toThrow(
				SyntaxError
			)
			expect(async () => await from`n into ${[1, 2]}`.toArray()).rejects.toThrow(SyntaxError)
			expect(async () => await from`join n in ${[1, 2]}`.toArray()).rejects.toThrow(SyntaxError)
		})

		test('aggregate', async () => {
			const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
			expect(await from`n in ${numbers} where n <= 5`.count()).toEqual(5)
			expect(await from`n in ${numbers} where n <= 5`.sum()).toEqual(15)
			expect(await from`n in ${numbers} where n <= 5`.min()).toEqual(1)
			expect(await from`n in ${numbers} where n <= 5`.max()).toEqual(5)
			expect(await from`n in ${numbers} where n <= 5`.average()).toEqual(3)
		})
	})
}
