import {
	OrderbyTransformation,
	type OrderSpec,
	Transformation,
	WhereTransformation
} from './transformations'

interface TemplateStringsReader {
	parts: TemplateStringsArray
	args: any
	part: number
	posInPart: number
}

export interface InlineValue {
	from: string[]
	strings: string[]
	args: any[]
}

export interface Parsed {
	from: string
	source: any
	transformations: Transformation[]
	select?: (value: any) => any
}

export class SyntaxError extends Error {
	constructor(reader: TemplateStringsReader, message: string) {
		const part = reader.parts[reader.part],
			indicator = !part
				? '-end of linq-'
				: part.substring(0, reader.posInPart) + '<^>' + part.substring(reader.posInPart)
		super(indicator + '\n' + message)
	}
}

function trim(reader: TemplateStringsReader) {
	if (reader.part >= reader.parts.length) return
	const pp = reader.parts[reader.part].substring(reader.posInPart)
	if (!pp.trim()) {
		if (reader.part >= reader.args.length) ++reader.part
	} else {
		const spaces = /^\s*/.exec(pp)!
		reader.posInPart += spaces[0].length
	}
}

function peekKeyword(reader: TemplateStringsReader) {
	trim(reader)
	let pp = reader.parts[reader.part]?.substring(reader.posInPart).trimStart()
	const bone = pp && /^(\w+)\s*/.exec(pp)
	return bone?.[1]
}

function nextKeyword(reader: TemplateStringsReader) {
	trim(reader)
	let pp = reader.parts[reader.part]?.substring(reader.posInPart).trimStart()
	const bone = pp && /^(\w+)\s*/.exec(pp)
	if (!bone) throw new SyntaxError(reader, 'Expecting key word')
	reader.posInPart += bone[0].length
	return bone[1]
}

function isRaw(reader: TemplateStringsReader, raw: string) {
	trim(reader)
	if (!reader.parts[reader.part]?.substring(reader.posInPart).startsWith(raw)) return false
	reader.posInPart += raw.length
	return true
}

function ended(reader: TemplateStringsReader) {
	trim(reader)
	return reader.part >= reader.parts.length
}

const linqKeywords = [
	'where',
	'select',
	'join',
	'orderby',
	'group',
	'ascending',
	'descending',
	'equals',
	'in'
]
const keywordPattern = linqKeywords.join('|') // Join keywords with '|'
const jsFirst = new RegExp(`\\s*(.*?)(?=\\s+(${keywordPattern}))`, 'i')

function nextValue(reader: TemplateStringsReader, from?: string[]) {
	trim(reader)
	let next = reader.parts[reader.part].substring(reader.posInPart)
	if (!next.trim()) {
		// direct ${...} value
		reader.posInPart = 0
		return reader.args[reader.part++]
	}
	if (!from) {
		throw new SyntaxError(reader, 'Value cannot be inline')
	}
	let parsable: InlineValue = {
			from,
			strings: [],
			args: []
		},
		nextRead
	do {
		nextRead = jsFirst.exec(next)
		if (!nextRead) {
			parsable.strings.push(next.trimStart())
			if (reader.part < reader.args.length) parsable.args.push(reader.args[reader.part])
			reader.part++
			reader.posInPart = 0
			next = reader.parts[reader.part]
		} else {
			parsable.strings.push(nextRead[1])
			reader.posInPart += nextRead[0].length
		}
	} while (!ended(reader) && !nextRead)
	return parsable
}

export function parse(parts: TemplateStringsArray, ...args: any[]): Parsed {
	const reader = {
		parts,
		args,
		part: 0,
		posInPart: 0
	}
	const from = nextKeyword(reader),
		keys = [from]
	if (nextKeyword(reader) !== 'in') throw new SyntaxError(reader, 'Expecting `in`')
	const source = nextValue(reader)
	const transformations: Transformation[] = []
	while (!ended(reader)) {
		switch (nextKeyword(reader)) {
			case 'where':
				const where = nextValue(reader, keys)
				transformations.push(new WhereTransformation(where))
				break
			case 'select':
				const select = nextValue(reader, keys)
				if (!ended(reader)) throw new SyntaxError(reader, 'Expecting `select` to finish the query')
				return { from, transformations, source, select }
			case 'orderby':
				const specs = { ascending: true, descending: false }
				const orders: OrderSpec[] = []
				do {
					const order = nextValue(reader, keys),
						ascSpec = peekKeyword(reader)
					if (ascSpec) nextKeyword(reader)
					orders.push({ value: order, asc: ascSpec && ascSpec in specs ? specs[ascSpec] : true })
				} while (isRaw(reader, ','))
				transformations.push(new OrderbyTransformation(orders))
				break
			case 'group':
			case 'join':
				throw 'todo'
			default:
				throw new SyntaxError(reader, 'Expecting `select`, `join` or `where`')
		}
	}
	return { from, transformations, source }
}
