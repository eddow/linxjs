import { Primitive } from '@linxjs/core'
import Knex, { type knex } from 'knex'

interface KnexInstance extends Knex.Knex {}

//#region Table columns
// TODO: Only sqlite3 has been tested

const cachedTableFields: Record<string, string[]> = {}
export async function getTableColumns(
	knexInstance: KnexInstance,
	tableName: string
): Promise<string[]> {
	if (cachedTableFields[tableName]) return cachedTableFields[tableName]
	const rv = await retrieveTableColumns(knexInstance, tableName)
	return (cachedTableFields[tableName] = rv)
}

function retrieveTableColumns(knexInstance: KnexInstance, tableName: string): Promise<string[]> {
	const client = knexInstance.client.config.client

	switch (client) {
		case 'pg': // PostgreSQL and Redshift
			return getPostgreSQLColumns(knexInstance, tableName)

		case 'mysql':
		case 'mysql2': // MySQL and MySQL2
		case 'mariadb': // MariaDB
			return getMySQLColumns(knexInstance, tableName)

		case 'sqlite3': // SQLite
			return getSQLiteColumns(knexInstance, tableName)

		case 'mssql': // Microsoft SQL Server
			return getMSSQLColumns(knexInstance, tableName)

		case 'oracledb': // Oracle
			return getOracleColumns(knexInstance, tableName)

		case 'phoenix': // Apache Phoenix
			return getPhoenixColumns(knexInstance, tableName)

		default:
			throw new Error(`Unsupported database client: ${client}`)
	}
}

// PostgreSQL & Amazon Redshift: Retrieve columns from information_schema
async function getPostgreSQLColumns(
	knexInstance: KnexInstance,
	tableName: string
): Promise<string[]> {
	const columns = await knexInstance('information_schema.columns').select('column_name').where({
		table_name: tableName,
		table_schema: 'public' // Adjust schema if necessary
	})
	return columns.map((col) => col.column_name)
}

// MySQL, MySQL2, MariaDB: Retrieve columns from information_schema
async function getMySQLColumns(knexInstance: KnexInstance, tableName: string): Promise<string[]> {
	const columns = await knexInstance('information_schema.columns').select('column_name').where({
		table_name: tableName,
		table_schema: knexInstance.client.connectionSettings.database
	})
	return columns.map((col) => col.column_name)
}

// SQLite: Retrieve columns using PRAGMA table_info
async function getSQLiteColumns(knexInstance: KnexInstance, tableName: string): Promise<string[]> {
	const result = await knexInstance.raw(`PRAGMA table_info(${tableName})`)
	return result.map((col: { name: string }) => col.name)
}

// Microsoft SQL Server: Retrieve columns from information_schema
async function getMSSQLColumns(knexInstance: KnexInstance, tableName: string): Promise<string[]> {
	const columns = await knexInstance('INFORMATION_SCHEMA.COLUMNS').select('COLUMN_NAME').where({
		TABLE_NAME: tableName
	})
	return columns.map((col) => col.COLUMN_NAME)
}

// Oracle: Retrieve columns from user_tab_columns
async function getOracleColumns(knexInstance: KnexInstance, tableName: string): Promise<string[]> {
	const columns = await knexInstance('user_tab_columns')
		.select('column_name')
		.where('table_name', tableName.toUpperCase())
	return columns.map((col) => col.column_name)
}

// Apache Phoenix: Retrieve columns from SYSTEM.CATALOG
async function getPhoenixColumns(knexInstance: KnexInstance, tableName: string): Promise<string[]> {
	const columns = await knexInstance('SYSTEM.CATALOG')
		.select('COLUMN_NAME')
		.where('TABLE_NAME', tableName.toUpperCase())
	return columns.map((col) => col.COLUMN_NAME)
}

//#endregion
//#region Types

export type QueryBuilder = knex.Knex.QueryBuilder

export type RawSql = [string, Primitive[]]
export interface FieldsDesc<T = string | RawSql> {
	[key: string]: T | FieldsDesc<T>
}
export type FieldDesc<T = string | RawSql> = T | FieldsDesc<T>

//#endregion
