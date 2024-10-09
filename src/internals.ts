import { Hardcodable } from './parser'

export class SemanticError extends Error {
	constructor(code: string, parent?: Error) {
		super(`Unparsable code: ${code}`)
	}
}

export interface Group<T = any> extends Array<T> {
	key: any
}

export interface TransmissibleFunction extends Function {
	jsCode: string
	values?: any[]
}

export function keyedGroup<T = any>(key: any, value: T[]) {
	return Object.assign([...value], { key })
}

function transmissibleFunction(
	fct: Function,
	jsCode: string,
	values?: any[]
): TransmissibleFunction {
	return Object.assign(fct, values ? { jsCode, values } : { jsCode })
}

const linxArgName = '$args$linx$'

export function makeFunction<T = any>(
	iv: Hardcodable<Function>,
	variables: string[]
): TransmissibleFunction {
	if (!variables) debugger
	if (typeof iv === 'function')
		return transmissibleFunction((args: any[]) => iv(...args), iv.toString())
	console.assert([iv.args.length, iv.args.length + 1].includes(iv.strings.length))
	if (iv.args.length) {
		const ivStrings = [...iv.strings],
			[strings, last] =
				iv.strings.length > iv.args.length ? [ivStrings, ivStrings.pop()] : [ivStrings, ''],
			fctCode = strings.map((s, i) => `${s} ${linxArgName}[${i}]`).join('') + last,
			fct = new Function([linxArgName, ...variables].join(','), 'return ' + fctCode)
		return transmissibleFunction(
			(args: any[]) =>
				fct(
					iv.args.map((iva) => (typeof iva === 'function' ? iva(...args) : iva)),
					...args
				),
			`(${variables.join(',')}) => ${fctCode}`,
			iv.args
		)
	}
	const value = iv.strings[0],
		fct = new Function(variables.join(','), `return ${value}`)
	return transmissibleFunction(
		(args: any[]) => fct(...args),
		`(${variables.join(',')}) => ${value}`
	)
}
