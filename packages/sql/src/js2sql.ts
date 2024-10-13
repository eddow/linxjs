import {
	Transmissible,
	Primitive,
	transmissibleFunction,
	TransmissibleFunction,
	BaseLinqEntry,
	SemanticError,
	linxArgName
} from '@linxjs/core'
import * as esprima from 'esprima'
import type {
	BinaryExpression,
	ExpressionStatement,
	Program,
	Property,
	UnaryExpression,
	BaseNode,
	Identifier,
	MemberExpression,
	Literal,
	ObjectExpression
} from 'estree'
import { FieldDesc, FieldsDesc, RawSql } from './dbUtils'

export class Js2sqlError extends Error {
	constructor(message: string) {
		super(message)
		this.name = 'js2sqlError'
	}
}

const operatorMap: Record<string, string> = {
		'==': '=',
		'===': '=',
		'!=': '<>',
		'!==': '<>',
		'<=': '<=',
		'>=': '>=',
		'<': '<',
		'>': '>',
		'||': 'OR',
		'&&': 'AND',
		'+': '+',
		'-': '-',
		'*': '*',
		'/': '/',
		'%': '%'
		//'**': '**'	// PG: x ^ y, others: POWER(x, y)
	},
	prefixMap: Record<string, string> = {
		'!': 'NOT',
		'-': '-',
		'+': '+'
	},
	postfixMap: Record<string, string> = {}

class AstBrowser<R> {
	constructor(
		public readonly fields: FieldDesc,
		public readonly tf: TransmissibleFunction<R>,
		public readonly complex: boolean
	) {}
	getField(node: Identifier | MemberExpression): FieldDesc {
		switch (node.type) {
			case 'Identifier':
				return (<FieldsDesc>this.fields)[(<Identifier>node).name]
			case 'MemberExpression':
				const memberExpression = <MemberExpression>node
				if (
					memberExpression.object.type !== 'Identifier' &&
					memberExpression.object.type !== 'MemberExpression'
				)
					throw new Js2sqlError('Computed properties not allowed')
				const fields = this.getField(memberExpression.object)
				if (typeof fields !== 'object' || fields instanceof Array)
					throw new Js2sqlError('Field has no components')
				if (memberExpression.property.type === 'Identifier') {
					return fields[memberExpression.property.name]
				}
				if (memberExpression.property.type === 'Literal') {
					if (typeof memberExpression.property.value !== 'string')
						throw new Js2sqlError(
							`Unsupported index ${typeof memberExpression.property.value} for field retrieval`
						)
					return fields[memberExpression.property.value]
				}
				throw new Js2sqlError(`Unsupported node type ${node.type} for field retrieval`)
			default:
				throw new Js2sqlError(`Unsupported node type ${(<BaseNode>node).type} for field retrieval`)
		}
	}
	parseValue(node: BaseNode): RawSql {
		switch (node.type) {
			case 'ArrayExpression':
				throw new Error('AST not implemented: ArrayExpression')
			case 'ArrayPattern':
				throw new Error('AST not implemented: ArrayPattern')
			case 'ArrowFunctionExpression':
				throw new Error('AST not implemented: ArrowFunctionExpression')
			case 'AssignmentExpression':
				throw new Error('AST not implemented: AssignmentExpression')
			case 'AssignmentPattern':
				throw new Error('AST not implemented: AssignmentPattern')
			case 'AwaitExpression':
				throw new Error('AST not implemented: AwaitExpression')
			case 'BinaryExpression':
				const binaryExpression = <BinaryExpression>node,
					newOp = operatorMap[binaryExpression.operator]
				if (!newOp) throw new Js2sqlError(`Unsupported operator ${binaryExpression.operator}`)
				const left = this.parseValue(binaryExpression.left),
					right = this.parseValue(binaryExpression.right)
				return [`${left[0]} ${newOp} ${right[0]}`, [...left[1], ...right[1]]]
			case 'BlockStatement':
				throw new Error('AST not implemented: BlockStatement')
			case 'BreakStatement':
				throw new Error('AST not implemented: BreakStatement')
			case 'CallExpression':
				throw new Error('AST not implemented: CallExpression')
			case 'CatchClause':
				throw new Error('AST not implemented: CatchClause')
			case 'ChainExpression':
				throw new Error('AST not implemented: ChainExpression')
			case 'ClassDeclaration':
				throw new Error('AST not implemented: ClassDeclaration')
			case 'ClassExpression':
				throw new Error('AST not implemented: ClassExpression')
			case 'ConditionalExpression':
				throw new Error('AST not implemented: ConditionalExpression')
			case 'ContinueStatement':
				throw new Error('AST not implemented: ContinueStatement')
			case 'DebuggerStatement':
				throw new Error('AST not implemented: DebuggerStatement')
			case 'DoWhileStatement':
				throw new Error('AST not implemented: DoWhileStatement')
			case 'EmptyStatement':
				throw new Error('AST not implemented: EmptyStatement')
			case 'ExportAllDeclaration':
				throw new Error('AST not implemented: ExportAllDeclaration')
			case 'ExportDefaultDeclaration':
				throw new Error('AST not implemented: ExportDefaultDeclaration')
			case 'ExportNamedDeclaration':
				throw new Error('AST not implemented: ExportNamedDeclaration')
			case 'ExportSpecifier':
				throw new Error('AST not implemented: ExportSpecifier')
			case 'ForInStatement':
				throw new Error('AST not implemented: ForInStatement')
			case 'ForOfStatement':
				throw new Error('AST not implemented: ForOfStatement')
			case 'ForStatement':
				throw new Error('AST not implemented: ForStatement')
			case 'FunctionDeclaration':
				throw new Error('AST not implemented: FunctionDeclaration')
			case 'FunctionExpression':
				throw new Error('AST not implemented: FunctionExpression')
			case 'IfStatement':
				throw new Error('AST not implemented: IfStatement')
			case 'Import':
				throw new Error('AST not implemented: Import')
			case 'ImportDeclaration':
				throw new Error('AST not implemented: ImportDeclaration')
			case 'ImportDefaultSpecifier':
				throw new Error('AST not implemented: ImportDefaultSpecifier')
			case 'ImportExpression':
				throw new Error('AST not implemented: ImportExpression')
			case 'ImportNamespaceSpecifier':
				throw new Error('AST not implemented: ImportNamespaceSpecifier')
			case 'ImportSpecifier':
				throw new Error('AST not implemented: ImportSpecifier')
			case 'LabeledStatement':
				throw new Error('AST not implemented: LabeledStatement')
			case 'Literal':
				const literal = <Literal>node
				let rawSql = literal.value
				return this.complex
					? [
							typeof rawSql === 'string'
								? (rawSql = "'" + rawSql.replace(/'/g, "''") + "'")
								: (rawSql = `${rawSql}`),
							[]
						]
					: ['?', [literal.value]]
			case 'LogicalExpression':
				throw new Error('AST not implemented: LogicalExpression')
			case 'MemberExpression':
				const memberExpression = <MemberExpression>node
				if (
					memberExpression.object.type === 'Identifier' &&
					memberExpression.object.name === linxArgName
				) {
					if (memberExpression.property.type !== 'Literal')
						throw new Js2sqlError(
							`Unsupported index ${memberExpression.property.type} for argument retrieval`
						)
					if (typeof memberExpression.property.value !== 'number')
						throw new Js2sqlError(
							`Unsupported index ${typeof memberExpression.property.value} for argument retrieval`
						)
					return <RawSql>(
						js2sql(this.tf.args[memberExpression.property.value], this.fields, this.complex)
					)
				}
			case 'Identifier':
				let field = this.getField(<Identifier | MemberExpression>node)
				if (typeof field === 'string') field = [field, []]
				if (!(field instanceof Array))
					throw new Js2sqlError(`Cannot retrieve field from ${JSON.stringify(field)}`)
				return field
			case 'MetaProperty':
				throw new Error('AST not implemented: MetaProperty')
			case 'MethodDefinition':
				throw new Error('AST not implemented: MethodDefinition')
			case 'NewExpression':
				throw new Error('AST not implemented: NewExpression')
			case 'ObjectPattern':
				throw new Error('AST not implemented: ObjectPattern')
			case 'PrivateIdentifier':
				throw new Error('AST not implemented: PrivateIdentifier')
			case 'Property':
				throw new Error('AST not implemented: Property')
			case 'ReturnStatement':
				throw new Error('AST not implemented: ReturnStatement')
			case 'RestElement':
				throw new Error('AST not implemented: RestElement')
			case 'SequenceExpression':
				throw new Error('AST not implemented: SequenceExpression')
			case 'SpreadElement':
				throw new Error('AST not implemented: SpreadElement')
			case 'Super':
				throw new Error('AST not implemented: Super')
			case 'SwitchCase':
				throw new Error('AST not implemented: SwitchCase')
			case 'SwitchStatement':
				throw new Error('AST not implemented: SwitchStatement')
			case 'TaggedTemplateExpression':
				throw new Error('AST not implemented: TaggedTemplateExpression')
			case 'TemplateElement':
				throw new Error('AST not implemented: TemplateElement')
			case 'TemplateLiteral':
				throw new Error('AST not implemented: TemplateLiteral')
			case 'ThisExpression':
				throw new Error('AST not implemented: ThisExpression')
			case 'ThrowStatement':
				throw new Error('AST not implemented: ThrowStatement')
			case 'TryStatement':
				throw new Error('AST not implemented: TryStatement')
			case 'UnaryExpression':
				const unaryExpression = <UnaryExpression>node,
					newFix = (unaryExpression.prefix ? prefixMap : postfixMap)[unaryExpression.operator]
				if (!newFix)
					throw new Error(
						`Unknown ${unaryExpression.prefix ? 'prefix' : 'postfix'}: ${unaryExpression.operator}`
					)
				const expr = this.parseValue(unaryExpression.argument)
				return [newFix + expr[0], expr[1]]
			case 'UpdateExpression':
				throw new Error('AST not implemented: UpdateExpression')
			case 'VariableDeclaration':
				throw new Error('AST not implemented: VariableDeclaration')
			case 'WhileStatement':
				throw new Error('AST not implemented: WhileStatement')
			case 'WithStatement':
				throw new Error('AST not implemented: WithStatement')
			case 'YieldExpression':
				throw new Error('AST not implemented: YieldExpression')
			default:
				throw new Error(`Unknown AST node type: ${node.type}`)
		}
	}

	parse(node: BaseNode): FieldDesc {
		switch (node.type) {
			case 'Program':
				const program = <Program>node
				if (program.body.length !== 1)
					throw new Js2sqlError('Expected only one statement in the lambda body')
				return this.parse(program.body[0])
			case 'ObjectExpression':
				if (!this.complex) throw new SemanticError('No object expressions in primitive values')
				const objectExpression = <ObjectExpression>node,
					rv: FieldsDesc = {}
				for (const property of objectExpression.properties) {
					// TODO spread elements?
					if (property.type === 'SpreadElement')
						throw new Js2sqlError('Spread elements not allowed')
					if (property.type !== 'Property')
						throw new Js2sqlError(`Unknown property type: ${(<BaseNode>property).type}`)
					if (property.computed)
						throw new Js2sqlError('Computed properties not allowed (eg. `{[key]: value}`')
					if (property.kind !== 'init') throw new Js2sqlError(`Getter and setter are not allowed`)
					if (property.method) throw new Js2sqlError('Method properties not allowed')
					const { key, value } = <Property>property
					if (key.type !== 'Identifier') throw new Js2sqlError(`Unsupported key type: ${key.type}`)
					rv[key.name] = this.parse(value)
				}
				return rv
			case 'ExpressionStatement':
				return this.parse((<ExpressionStatement>node).expression)
			default:
				return this.parseValue(node)
		}
	}
}

function js2sql<R>(js: Transmissible<R>, fields: FieldDesc, complex: boolean): FieldDesc {
	const tf = transmissibleFunction(js)
	if (tf.constant) return ['?', [<Primitive>tf.constant]]
	if (!tf.fromQSEntry) {
		if (tf.params.length !== 1) return [tf.body, []]
		fields = { [tf.params[0]]: fields }
	}
	try {
		return new AstBrowser(fields, tf, complex).parse(
			esprima.parseScript(/^\{(.*)\}$/.test(tf.body) ? `(${tf.body})` : tf.body)
		)
	} catch (err) {
		err.message = `While parsing \`${tf.body}\`: ${err.message}`
		throw err
	}
}
export function js2sqlPrimitive<R extends Primitive>(
	js: Transmissible<R>,
	fields: FieldDesc
): RawSql {
	return <RawSql>js2sql<R>(js, fields, false)
}

export function js2sqlComplex<R>(js: Transmissible<R>, fields: FieldDesc): FieldDesc {
	return js2sql<R>(js, fields, true)
}
