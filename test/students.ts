import linq from '@linxjs/core'

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

export default function (linquer: any, students: any, courses: any, registrations: any) {
	const l = linq(linquer)

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
			expect([
				...l`from s in ${students} let year = 1979-s.age select {name: s.name, year}`
			]).toEqual([
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

		test('join', () => {
			expect([
				...l`from s in ${students}
				join r in ${registrations} on s.name equals r.name
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
				join r in ${registrations} on r.name equals s.name into courses
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
				join r in ${registrations} on s.name equals r.name into courses
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
}
