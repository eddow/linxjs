import linq from '@linxjs/core'
import memLinq from '../src'

const l = linq(memLinq)

interface Student {
	name: string
	age: number
}

interface Course {
	name: string
	hours: number
}

interface Registration {
	name: string
	course: string
}

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

const registration: Registration[] = [
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

describe('students', () => {
	test('orderby', () => {
		expect([...l`from s in ${students} orderby s.age, s.name select s.name`]).toEqual([
			'Peter',
			'Bob',
			'Sara',
			'John',
			'Mark',
			'Marlene',
			'Tim'
		])
	})
	test('let', () => {
		expect([...l`from s in ${students} let year = 1979-s.age select {name: s.name, year}`]).toEqual(
			[
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
				},
				{
					name: 'Marlene',
					year: 1957
				}
			]
		)
	})

	test('join', () => {
		expect([
			...l`from s in ${students}
				join r in ${registration} on s.name equals r.name
				join c in ${courses} on r.course equals c.name
				orderby s.name, c.course
				select { name: s.name, course: c.name, hours: c.hours }`
		]).toEqual([
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

	test('join into', () => {
		expect([
			...l`from s in ${students}
				join r in ${registration} on r.name equals s.name into courses
				select ${(s: Student, courses: Registration[]) => ({ name: s.name, courses: courses.map((c) => c.course) })}`
		]).toEqual([
			{ name: 'Bob', courses: ['Geography'] },
			{ name: 'John', courses: ['History', 'Geography'] },
			{ name: 'Mark', courses: ['Math', 'English'] },
			{ name: 'Peter', courses: ['English', 'Chemistry'] },
			{ name: 'Sara', courses: ['Chemistry', 'Physics'] },
			{ name: 'Tim', courses: ['Physics', 'History'] }
		])
	})

	test('join into from', () => {
		expect([
			...l`from s in ${students}
				join r in ${registration} on s.name equals r.name into courses
				from c in courses
				orderby s.name, c.course
				select {name: s.name, course: c.course }`
		]).toEqual([
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
		])
	})
})
