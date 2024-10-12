import { LinqCollection } from './collection'
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
import {
	BaseLinqEntry,
	BaseLinqQSEntry,
	InlineValue,
	LinqParseError,
	OrderSpec,
	Primitive,
	SemanticError,
	TransmissibleFunction
} from './value'

export interface Parsed {
	enumerable: any
	variables: string[]
	transformations: Transformation[]
}

const linqKeywords = [
	'from',
	'where',
	'select',
	'join',
	'order',
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
	 * @throws {LinqParseError} If the next word is not a valid key word.
	 * @returns The next word
	 */
	nextWord() {
		this.trim()
		let pp = this.parts[this.part]?.substring(this.posInPart).trimStart()
		const bone = pp && /^(\w+)\s*/.exec(pp)
		if (!bone) throw new LinqParseError(this, 'Expecting key word')
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
	nextValue<T>(variables: string[], type?: 'simple' | 'external'): TransmissibleFunction<T> {
		this.trim()
		let next = this.parts[this.part].substring(this.posInPart)
		if (!next.trim()) {
			// direct ${...} value
			this.posInPart = 0
			const value = this.args[this.part++]
			return new TransmissibleFunction<T>(
				typeof value === 'function' ? value : new InlineValue([value]),
				variables
			)
		}
		let parsable = new InlineValue(),
			nextRead
		if (type === 'external') throw new LinqParseError(this, 'Expecting external value: ${...}')
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
		return new TransmissibleFunction<T>(parsable, variables)
	}

	isWord<W extends string>(...words: W[]): W | false {
		const word = this.peekWord()
		if (!word || !words.includes(<W>word)) return false
		return <W>this.nextWord()
	}

	/**
	 * Consumes the next word and throws a LinqParseError if it is not the given word.
	 * @param word The word to expect.
	 * @throws {LinqParseError} If the next word is not the given word.
	 */
	expect(...words: string[]): true {
		if (!this.isWord(...words)) throw new LinqParseError(this, `Expecting ${words.join(' or ')}`)
		return true
	}

	/**
	 * Consumes the next given characters and throws a LinqParseError if they are not found.
	 * @param raw The raw string to expect.
	 * @throws {LinqParseError} If the next word is not the given raw string.
	 */
	expectRaw(raw: string): true {
		if (!this.isRaw(raw)) throw new LinqParseError(this, `Expecting ${raw}`)
		return true
	}
}

export function parse(parts: TemplateStringsArray, ...args: any[]) {
	let variables: string[] = []
	const reader = new TemplateStringsReader(
			parts.map((p) => p.replace(/\n|\r/g, ' ')), //cr & lf always screw up regex-es
			args
		),
		transformations: Transformation[] = [],
		from = reader.nextWord(),
		source = reader.expect('in') && reader.nextValue<LinqCollection>(variables)
	if (!(source.constant instanceof LinqCollection))
		throw new SemanticError('Expecting a constant LinqCollection source')
	variables = [...variables, from]
	const rv = { from, source: source.constant, transformations }
	while (!reader.ended()) {
		const transformationName = reader.nextWord(),
			createTransformation = {
				from: () =>
					new FromTransformation(
						reader.nextWord(),
						reader.expect('in') && reader.nextValue<LinqCollection>(variables)
					),
				where: () => new WhereTransformation(reader.nextValue(variables)),
				order: () => {
					reader.expectRaw('by')
					const specs: { [key: string]: 'asc' | 'desc' } = { ascending: 'asc', descending: 'desc' }
					const orders: OrderSpec[] = []
					do {
						const order = reader.nextValue<Primitive>(variables, 'simple'),
							ascSpec = reader.isWord('ascending', 'descending'),
							ascIsSpec = ascSpec && ascSpec in specs
						orders.push({ by: order, way: ascIsSpec ? specs[ascSpec] : 'asc' })
					} while (reader.isRaw(','))
					return new OrderbyTransformation(orders)
				},

				let: () =>
					new LetTransformation(
						reader.nextWord(),
						reader.expectRaw('=') && reader.nextValue(variables)
					),
				join: () => {
					const variable = reader.nextWord()
					return new JoinTransformation(
						variable,
						reader.expect('in') && reader.nextValue<LinqCollection>(variables, 'external'),
						reader.expect('on') && reader.nextValue(variables),
						reader.expect('equals') && reader.nextValue([variable]),
						reader.isWord('into') ? reader.nextWord() : undefined
					)
				},
				group: () =>
					new GroupTransformation(
						variables.length === 1 ? variables[0] : undefined,
						reader.peekWord() === 'by' ? undefined : reader.nextValue<BaseLinqEntry>(variables),
						reader.expect('by') && reader.nextValue(variables),
						reader.isWord('into') ? reader.nextWord() : undefined
					),
				select: () =>
					new SelectTransformation(
						reader.nextValue<BaseLinqQSEntry>(variables),
						reader.isWord('into') ? reader.nextWord() : undefined
					)
			}[transformationName]
		if (!createTransformation)
			throw new LinqParseError(reader, `Unknown transformation: ${transformationName}`)
		const transformation = createTransformation()
		variables = transformation.newVariables(variables)
		rv.transformations.push(transformation)
	}
	return rv
}
