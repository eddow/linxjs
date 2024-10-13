import knex from 'knex'
import { sqlCollection } from './src'
import { default as from, LinqCollection, LinqParseError } from '@linxjs/core'
import { getTableColumns } from './src/dbUtils'
import testNumbers from '../../test/numbers'

interface NumberEntry {
	n: number
}

const db = knex({
	client: 'sqlite3',
	connection: {
		filename: ':memory:' // Use :memory: for an in-memory database
	},
	useNullAsDefault: true // SQLite requires this for default values
})

const numberTables: { numbers?: LinqCollection<number> } = {}

beforeAll(async () => {
	await db.schema.createTable('numbers', (table) => {
		table.integer('n')
	})
	await db('numbers').insert([1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => ({ n })))
	const numbers = sqlCollection<NumberEntry>(db, 'numbers').select(
		(number: NumberEntry) => number.n
	)
	numberTables.numbers = numbers
})

describe('sql', () => {
	test('getTableColumns', async () => {
		expect(await getTableColumns(db, 'numbers')).toEqual(['n'])
	})
	test('debug', async () => {
		expect(
			await from`n in ${numberTables.numbers!} where n % 2 === 0 select { n, inc: ${(n: number) => n + 1}, d: 3 }`.toArray()
		).toEqual([
			{ n: 2, inc: 3, d: 3 },
			{ n: 4, inc: 5, d: 3 },
			{ n: 6, inc: 7, d: 3 },
			{ n: 8, inc: 9, d: 3 },
			{ n: 10, inc: 11, d: 3 }
		])
	})
})

describe('numbers', () => {
	//testNumbers(numberTables)
})
