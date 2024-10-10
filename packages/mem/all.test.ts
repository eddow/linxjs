import memLinq from './src'
import { allTests, type Student, type Course, type Registration } from '../../test'
import { Group, LinqCollection } from '@linxjs/core'

const students: Student[] = [
	{ name: 'Mark', age: 22 },
	{ name: 'Peter', age: 20 },
	{ name: 'Sara', age: 21 },
	{ name: 'Tim', age: 22 },
	{ name: 'John', age: 22 },
	{ name: 'Bob', age: 21 },
	{ name: 'Marlene', age: 22 }
]
const courses: Course[] = [
	{ name: 'Math', hours: 60 },
	{ name: 'English', hours: 40 },
	{ name: 'Chemistry', hours: 20 },
	{ name: 'Physics', hours: 35 },
	{ name: 'History', hours: 10 },
	{ name: 'Geography', hours: 15 }
]

const registrations: Registration[] = [
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
]

allTests(memLinq, students, courses, registrations)

/*const from = memLinq
describe('debug', () => {
	test('here', async () => {
		const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
		const grouped = from<Group<number>>
		expect(
			await grouped`n in ${numbers} group n by n % 2`
				.select(async (g: Group<number>) => [g.key, await g.toArray()])
				.toArray()
		).toEqual([
			[0, [2, 4, 6, 8, 10]],
			[1, [1, 3, 5, 7, 9]]
		])
	})
})
*/
