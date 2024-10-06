import linq, { memLinq } from '../src'

const l = linq(memLinq)

const students = [
	{ name: 'Mark', age: 22 },
	{ name: 'Peter', age: 20 },
	{ name: 'Sara', age: 21 },
	{ name: 'Tim', age: 22 },
	{ name: 'John', age: 22 },
	{ name: 'Bob', age: 21 }
]
const courses = [
	{ name: 'Math', hours: 60 },
	{ name: 'English', hours: 40 },
	{ name: 'Chemistry', hours: 20 },
	{ name: 'Physics', hours: 35 },
	{ name: 'History', hours: 10 },
	{ name: 'Geography', hours: 15 }
]

const registration = [
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
		expect([...l`s in ${students} orderby s.age, s.name select s.name`]).toEqual([
			'Peter',
			'Bob',
			'Sara',
			'John',
			'Mark',
			'Tim'
		])
	})
	test('let', () => {
		expect([...l`s in ${students} let year = 1979-s.age select {name: s.name, year}`]).toEqual([
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

	test('join', () => {
		// TODO order by left key
		expect([
			...l`s in ${students}
				join r in ${registration} on s.name equals r.name
				join c in ${courses} on r.course equals c.name
				select { name: s.name, course: c.name, hours: c.hours }`
		]).toEqual([
			{ name: 'Peter', course: 'Chemistry', hours: 20 },
			{ name: 'Sara', course: 'Chemistry', hours: 20 },
			{ name: 'Mark', course: 'English', hours: 40 },
			{ name: 'Peter', course: 'English', hours: 40 },
			{ name: 'Bob', course: 'Geography', hours: 15 },
			{ name: 'John', course: 'Geography', hours: 15 },
			{ name: 'John', course: 'History', hours: 10 },
			{ name: 'Tim', course: 'History', hours: 10 },
			{ name: 'Mark', course: 'Math', hours: 60 },
			{ name: 'Sara', course: 'Physics', hours: 35 },
			{ name: 'Tim', course: 'Physics', hours: 35 }
		])
	})

	test('join into', () => {
		expect([
			...l`s in ${students} join r in ${registration} on s.name equals r.name into
				courses select ${(s, courses) => ({ name: s.name, courses: courses.map((c) => c.course) })}`
		]).toEqual([
			{ name: 'Bob', courses: ['Geography'] },
			{ name: 'John', courses: ['History', 'Geography'] },
			{ name: 'Mark', courses: ['Math', 'English'] },
			{ name: 'Peter', courses: ['English', 'Chemistry'] },
			{ name: 'Sara', courses: ['Chemistry', 'Physics'] },
			{ name: 'Tim', courses: ['Physics', 'History'] }
		])
	})
})
