import { Linq } from '@linxjs/core'
import standardTest from './standard'
import studentsTest, { type Student, type Course, type Registration } from './students'
export { type Student, type Course, type Registration }

export function allTests(
	from: Linq,
	students: Student[],
	courses: Course[],
	registrations: Registration[]
) {
	standardTest(from)
	studentsTest(from, students, courses, registrations)
}
