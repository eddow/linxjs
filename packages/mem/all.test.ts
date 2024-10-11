import memCollection from './src'
import { allTests, type Student, type Course, type Registration } from '../../test'
import { default as from, Group } from '@linxjs/core'

const numbers = memCollection([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]),
	students = memCollection([
		{ name: 'Mark', age: 22 },
		{ name: 'Peter', age: 20 },
		{ name: 'Sara', age: 21 },
		{ name: 'Tim', age: 22 },
		{ name: 'John', age: 22 },
		{ name: 'Bob', age: 21 },
		{ name: 'Marlene', age: 22 }
	]),
	courses = memCollection([
		{ name: 'Math', hours: 60 },
		{ name: 'English', hours: 40 },
		{ name: 'Chemistry', hours: 20 },
		{ name: 'Physics', hours: 35 },
		{ name: 'History', hours: 10 },
		{ name: 'Geography', hours: 15 }
	]),
	registrations = memCollection([
		{ name: 'Mark', course: 'Math' },
		{ name: 'Peter', course: 'English' },
		{ name: 'Sara', course: 'Chemistry' },
		{ name: 'Tim', course: 'Physics' },
		{ name: 'John', course: 'History' },
		{ name: 'Bob', course: 'Geography' },
		{ name: 'Mark', course: 'English' },
		{ name: 'Peter', course: 'Chemistry' },
		{ name: 'Sara', course: 'Physics' },
		{ name: 'Tim', course: 'History' },
		{ name: 'John', course: 'Geography' },
		{ name: 'Alf', course: 'Math' }
	])

allTests(numbers, students, courses, registrations)

describe('debug', () => {
	test('here', async () => {
		/*expect(
			await from`s in ${students}
				join r in ${registrations} on s.name equals r.name
				order by s.name, r.course
				select { name: s.name, course: r.course }`.toArray()
		).toEqual([
			{ name: 'Bob', course: 'Geography' },
			{ name: 'John', course: 'Geography' },
			{ name: 'John', course: 'History' },
			{ name: 'Mark', course: 'English' },
			{ name: 'Mark', course: 'Math' },
			{ name: 'Peter', course: 'Chemistry' },
			{ name: 'Peter', course: 'English' },
			{ name: 'Sara', course: 'Chemistry' },
			{ name: 'Sara', course: 'Physics' },
			{ name: 'Tim', course: 'History' },
			{ name: 'Tim', course: 'Physics' }
		])*/
	})
})
