import linq, { memLinq } from '../src'

const from = linq(memLinq)

const students = [
	{ name: 'Mark', age: 22 },
	{ name: 'Peter', age: 20 },
	{ name: 'Sara', age: 21 },
	{ name: 'Tim', age: 22 },
	{ name: 'John', age: 22 },
	{ name: 'Bob', age: 21 }
]

describe('students', () => {
	test('orderby', () => {
		expect(from`s in ${students} orderby s.age, s.name select s.name`).toEqual([
			'Peter',
			'Bob',
			'Sara',
			'John',
			'Mark',
			'Tim'
		])
	})
	test('let', () => {
		expect(from`s in ${students} let year = 1979-s.age select {name: s.name, year}`).toEqual([
			{
				name: 'Mark',
				year: 1957
			},
			{
				name: 'Peter',
				year: 1959
			},
			{
				name: 'Sara',
				year: 1958
			},
			{
				name: 'Tim',
				year: 1957
			},
			{
				name: 'John',
				year: 1957
			},
			{
				name: 'Bob',
				year: 1958
			}
		])
	})
})
