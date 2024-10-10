import {
	FromTransformation,
	GroupTransformation,
	JoinTransformation,
	LetTransformation,
	OrderbyTransformation,
	SelectTransformation,
	Transformation,
	WhereTransformation
} from './transformations'

export class InlineValue {
	constructor(
		public strings: string[] = [],
		public args: any[] = []
	) {}
}

export interface OrderSpec {
	value: Hardcodable<Function>
	way: 'asc' | 'desc'
}
export type Hardcodable<T = any> = T | InlineValue

export interface Parsed {
	enumerable: any
	variables: string[]
	transformations: Transformation[]
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

const linqKeywords = [
	'from',
	'where',
	'select',
	'join',
	'orderby',
	'group',
	'by',
	'into',
	'ascending',
	'descending',
	'equals',
	'on',
	'in',
	'let'
]
const keywordPattern = linqKeywords.join('|')
const jsFirst = new RegExp(`(\\s*(.*?))(?:(?:\\s|^)(${keywordPattern})(?:\\s|$))`, 'i')
const noComma = new RegExp(`(\\s*([^,]*))`, 'i')

export class TemplateStringsReader {
	constructor(
		public parts: string[],
		public args: any[],
		public part: number = 0,
		public posInPart: number = 0
	) {}

	/**
	 * Skips whitespace from current position.
	 * If current position is at an argument, moves to next one.
	 * If current position is at the end of a part, moves to the next part.
	 */
	trim() {
		if (this.part >= this.parts.length) return
		const pp = this.parts[this.part].substring(this.posInPart)
		if (!pp.trim()) {
			if (this.part >= this.args.length) ++this.part
		} else {
			const spaces = /^\s*/.exec(pp)!
			this.posInPart += spaces[0].length
		}
	}

	/**
	 * Peek the next word and returns it, otherwise returns undefined.
	 * @returns The next word if it is "ascending" or "descending", otherwise undefined.
	 */
	peekWord() {
		// variable "ascending"/"descending" ?
		this.trim()
		let pp = this.parts[this.part]?.substring(this.posInPart).trimStart()
		const bone = pp && /^(\w+)\s*/.exec(pp)
		return bone?.[1]
	}

	/**
	 * Consumes the next word and returns it.
	 * Skips whitespace from the current position.
	 * If current position is at an argument, moves to next one.
	 * If current position is at the end of a part, moves to the next part.
	 * @throws {SyntaxError} If the next word is not a valid key word.
	 * @returns The next word
	 */
	nextWord() {
		this.trim()
		let pp = this.parts[this.part]?.substring(this.posInPart).trimStart()
		const bone = pp && /^(\w+)\s*/.exec(pp)
		if (!bone) throw new SyntaxError(this, 'Expecting key word')
		this.posInPart += bone[0].length
		return bone[1]
	}

	/**
	 * Returns true if the current position is at the given raw string.
	 * Consumes the raw string if it is found.
	 * Skips whitespace from the current position.
	 * If current position is at an argument, moves to next one.
	 * If current position is at the end of a part, moves to the next part.
	 * @param raw The raw string to look for.
	 * @returns True if the raw string is found, false otherwise.
	 */
	isRaw(raw: string) {
		this.trim()
		if (!this.parts[this.part]?.substring(this.posInPart).startsWith(raw)) return false
		this.posInPart += raw.length
		return true
	}

	/**
	 * Returns true if the end of the linq query has been reached.
	 * A linq query has ended when the current position is at the end of the last part.
	 * @returns True if the end of the linq query has been reached, false otherwise.
	 */
	ended() {
		this.trim()
		return this.part >= this.parts.length
	}

	/**
	 * Parses the next value, given the current position.
	 * If the current position is at a direct ${...} value, it is returned.
	 * Otherwise, the value is parsed as an InlineValue.
	 * The InlineValue is built by parsing the parts of the linq query.
	 * The parts are split by commas and the resulting strings are added to the InlineValue.strings array.
	 * The args array is populated with the corresponding argument of each part.
	 * The from array is populated with the given from array.
	 * @param from The array of strings to add to the InlineValue.from array.
	 * @param simple If true, the value is parsed without commas. Defaults to false.
	 * @returns The parsed InlineValue.
	 */
	nextValue<T = any>(type?: 'simple' | 'external'): Hardcodable<T> {
		this.trim()
		let next = this.parts[this.part].substring(this.posInPart)
		if (!next.trim()) {
			// direct ${...} value
			this.posInPart = 0
			return this.args[this.part++]
		}
		let parsable = new InlineValue(),
			nextRead
		if (type === 'external') throw new SyntaxError(this, 'Expecting external value: ${...}')
		do {
			nextRead = jsFirst.exec(next)
			const commaLess = noComma.exec(next)
			if (type === 'simple' && commaLess && (!nextRead || nextRead[0].length > commaLess[0].length))
				nextRead = commaLess
			if (!nextRead) {
				parsable.strings.push(next.trimStart())
				if (this.part < this.args.length) parsable.args.push(this.args[this.part])
				this.part++
				this.posInPart = 0
				next = this.parts[this.part]
			} else {
				parsable.strings.push(nextRead[2])
				this.posInPart += nextRead[1].length
			}
		} while (!this.ended() && !nextRead)
		return parsable
	}

	isWord<W extends string>(...words: W[]): W | false {
		const word = this.peekWord()
		if (!word || !words.includes(<W>word)) return false
		return <W>this.nextWord()
	}

	/**
	 * Consumes the next word and throws a SyntaxError if it is not the given word.
	 * @param word The word to expect.
	 * @throws {SyntaxError} If the next word is not the given word.
	 */
	expect(...words: string[]): true {
		if (!this.isWord(...words)) throw new SyntaxError(this, `Expecting ${words.join(' or ')}`)
		return true
	}

	/**
	 * Consumes the next given characters and throws a SyntaxError if they are not found.
	 * @param raw The raw string to expect.
	 * @throws {SyntaxError} If the next word is not the given raw string.
	 */
	expectRaw(raw: string): true {
		if (!this.isRaw(raw)) throw new SyntaxError(this, `Expecting ${raw}`)
		return true
	}
}

export function parse(parts: TemplateStringsArray, ...args: any[]) {
	const reader = new TemplateStringsReader(
		parts.map((p) => p.replace(/\n|\r/g, ' ')), //cr & lf always screw up regex-es
		args
	)
	const transformations: Transformation[] = [],
		rv = {
			from: reader.nextWord(),
			source: reader.expect('in') && reader.nextValue(),
			transformations
		}
	while (!reader.ended()) {
		const transformation = reader.nextWord()
		switch (transformation) {
			case 'from':
				transformations.push(
					new FromTransformation(reader.nextWord(), reader.expect('in') && reader.nextValue())
				)
				break
			case 'where':
				transformations.push(new WhereTransformation(reader.nextValue()))
				break
			case 'orderby':
				const specs: { [key: string]: 'asc' | 'desc' } = { ascending: 'asc', descending: 'desc' }
				const orders: OrderSpec[] = []
				do {
					const order = reader.nextValue('simple'),
						ascSpec = reader.isWord('ascending', 'descending'),
						ascIsSpec = ascSpec && ascSpec in specs
					orders.push({ value: order, way: ascIsSpec ? specs[ascSpec] : 'asc' })
				} while (reader.isRaw(','))
				transformations.push(new OrderbyTransformation(orders))
				break
			case 'let':
				const variable = reader.nextWord()
				reader.expectRaw('=')
				const value = reader.nextValue()
				transformations.push(new LetTransformation(variable, value))
				break
			case 'join':
				transformations.push(
					new JoinTransformation(
						reader.nextWord(),
						reader.expect('in') && reader.nextValue('external'),
						reader.expect('on') && reader.nextValue(),
						reader.expect('equals') && reader.nextValue(),
						reader.isWord('into') ? reader.nextWord() : undefined
					)
				)
				break
			case 'group':
				transformations.push(
					new GroupTransformation(
						reader.peekWord() === 'by' ? (x: any) => x : reader.nextValue(),
						reader.expect('by') && reader.nextValue(),
						reader.isWord('into') && reader.nextWord()
					)
				)
				break
			case 'select':
				transformations.push(
					new SelectTransformation(
						reader.nextValue(),
						reader.isWord('into') ? reader.nextWord() : undefined
					)
				)
				if (!reader.ended()) throw new SyntaxError(reader, 'Expecting `select` to finish the query')
				break
			default:
				throw new SyntaxError(reader, 'Expecting linq set transformation')
		}
	}
	return rv
}
