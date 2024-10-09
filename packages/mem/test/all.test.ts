import memLinq from '../src'
import { allTests, type Student, type Course, type Registration } from '../../../test'

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
