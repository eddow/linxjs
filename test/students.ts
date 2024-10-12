import { default as from } from '@linxjs/core'

export interface Student {
	name: string
	age: number
}

export interface Course {
	name: string
	hours: number
}

export interface Registration {
	name: string
	course: string
}

export default function (students: any, courses: any, registrations: any) {
	test('order by', async () => {
		expect(await from`s in ${students} order by s.age, s.name select s.name`.toArray()).toEqual([
			'Peter',
			'Bob',
			'Sara',
			'John',
			'Mark',
			'Marlene',
			'Tim'
		])
	})
	test('let', async () => {
		expect(
			await from`s in ${students} let year = 1979-s.age select {name: s.name, year}`.toArray()
		).toEqual([
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
		])
	})

	test('join', async () => {
		expect(
			await from`s in ${students}
				join r in ${registrations} on s.name equals r.name
				join c in ${courses} on r.course equals c.name
				order by s.name, c.name
				select { name: s.name, course: c.name, hours: c.hours }`.toArray()
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

	test('join into', async () => {
		expect(
			await from`s in ${students}
				join r in ${registrations} on s.name equals r.name into courses
				select ${(s: Student, courses: Registration[]) => ({ name: s.name, courses: courses.map((c) => c.course) })}`.toArray()
		).toEqual([
			{ name: 'Bob', courses: ['Geography'] },
			{ name: 'John', courses: ['History', 'Geography'] },
			{ name: 'Mark', courses: ['Math', 'English'] },
			{ name: 'Marlene', courses: [] },
			{ name: 'Peter', courses: ['English', 'Chemistry'] },
			{ name: 'Sara', courses: ['Chemistry', 'Physics'] },
			{ name: 'Tim', courses: ['Physics', 'History'] }
		])
	})

	test('join into from', async () => {
		expect(
			await from`s in ${students}
				join r in ${registrations} on s.name equals r.name into courses
				from c in courses
				order by s.name, c.course
				select {name: s.name, course: c.course }`.toArray()
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
		])
	})
}
