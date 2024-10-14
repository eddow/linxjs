import memCollection from './src'
import { allTests, type Student, type Course, type Registration } from '../../test'
import { default as from, Group, LinqCollection } from '@linxjs/core'

const numberTables = {
		numbers: memCollection<number>([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
	},
	students = memCollection<Student>([
		{ name: 'Mark', age: 22 },
		{ name: 'Peter', age: 20 },
		{ name: 'Sara', age: 21 },
		{ name: 'Tim', age: 22 },
		{ name: 'John', age: 22 },
		{ name: 'Bob', age: 21 },
		{ name: 'Marlene', age: 22 }
	]),
	courses = memCollection<Course>([
		{ name: 'Math', hours: 60 },
		{ name: 'English', hours: 40 },
		{ name: 'Chemistry', hours: 20 },
		{ name: 'Physics', hours: 35 },
		{ name: 'History', hours: 10 },
		{ name: 'Geography', hours: 15 }
	]),
	registrations = memCollection<Registration>([
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
	]) //allTests(numberTables, students, courses, registrations)
describe('debug', () => {
	test('here', async () => {
		/*expect(
			await from`s in ${students}
				join r in ${registrations} on s.name equals r.name into courses
				select ${(s: Student, courses: LinqCollection<Registration>) => ({
					name: s.name,
					courses: courses.select((c) => c.course)
				})}`.toArray()
		).toEqual([
			{ name: 'Bob', courses: ['Geography'] },
			{ name: 'John', courses: ['History', 'Geography'] },
			{ name: 'Mark', courses: ['Math', 'English'] },
			{ name: 'Marlene', courses: [] },
			{ name: 'Peter', courses: ['English', 'Chemistry'] },
			{ name: 'Sara', courses: ['Chemistry', 'Physics'] },
			{ name: 'Tim', courses: ['Physics', 'History'] }
		])*/
		expect(
			await from`s in ${students}
				join r in ${registrations} on s.name equals r.name
				join c in ${courses} on r.course equals c.name into courses
				order by s.name
				select ${async (s, courses) => ({ name: s.name, hours: await courses.count() })}`.toArray()
		).toEqual([
			{ name: 'Bob', course: 'Geography', hours: 15 },
			{ name: 'John', course: 'Geography', hours: 15 },
			{ name: 'John', course: 'History', hours: 10 },
			{ name: 'Mark', course: 'English', hours: 40 },
			{ name: 'Mark', course: 'Math', hours: 60 },
			{ name: 'Peter', course: 'Chemistry', hours: 20 },
			{ name: 'Peter', course: 'English', hours: 40 },
			{ name: 'Sara', course: 'Chemistry', hours: 20 },
			{ name: 'Sara', course: 'Physics', hours: 35 },
			{ name: 'Tim', course: 'History', hours: 10 },
			{ name: 'Tim', course: 'Physics', hours: 35 }
		])
		expect(
			await from`s in ${students}
				join r in ${registrations} on s.name equals r.name
				join c in ${courses} on r.course equals c.name into courses
				order by s.name
				select { name: s.name, hours: courses.count() }`.toArray()
		).toEqual([
			{ name: 'Bob', course: 'Geography', hours: 15 },
			{ name: 'John', course: 'Geography', hours: 15 },
			{ name: 'John', course: 'History', hours: 10 },
			{ name: 'Mark', course: 'English', hours: 40 },
			{ name: 'Mark', course: 'Math', hours: 60 },
			{ name: 'Peter', course: 'Chemistry', hours: 20 },
			{ name: 'Peter', course: 'English', hours: 40 },
			{ name: 'Sara', course: 'Chemistry', hours: 20 },
			{ name: 'Sara', course: 'Physics', hours: 35 },
			{ name: 'Tim', course: 'History', hours: 10 },
			{ name: 'Tim', course: 'Physics', hours: 35 }
		])
	})
})
