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
		const tables = numberTables
		expect(await from`n in ${tables.numbers!} order by n`.toArray()).toEqual([
			1, 2, 3, 4, 5, 6, 7, 8, 9, 10
		])
		expect(await from`n in ${tables.numbers!} order by -n ascending`.toArray()).toEqual([
			10, 9, 8, 7, 6, 5, 4, 3, 2, 1
		])
		expect(await from`n in ${tables.numbers!} order by n descending`.toArray()).toEqual([
			10, 9, 8, 7, 6, 5, 4, 3, 2, 1
		])
	})
})

describe('numbers', () => {
	testNumbers(numberTables)
})
