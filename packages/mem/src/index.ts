import linq, { LinqCollection, Transformation, ai } from '@linxjs/core'
import transform from './transformations'
import { MemCollection } from './core'

export type PartialResult<T = any> = AsyncIterable<T[], any, any>

export default linq(function memLinq<T = any>(
	transformations: Transformation[]
): LinqCollection<T> {
	let enumerable: PartialResult = undefined,
		variables: string[] | undefined = undefined
	for (const transformation of transformations) {
		enumerable = transform[transformation.constructor.name](enumerable, variables, transformation)
		variables = transformation.newVariables(variables)
	}
	return new MemCollection<T>(ai.map(enumerable, (v) => v[0]))
})
