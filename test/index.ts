import standardTest from './standard'
import studentsTest, { type Student, type Course, type Registration } from './students'
export { type Student, type Course, type Registration }

export function allTests(memLinq, students, courses, registrations) {
	standardTest(memLinq)
	studentsTest(memLinq, students, courses, registrations)
}
