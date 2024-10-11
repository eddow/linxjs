import { LinqCollection } from '@linxjs/core'
import standardTest from './numbers'
import studentsTest, { type Student, type Course, type Registration } from './students'
export { type Student, type Course, type Registration }

export function allTests(
	numbers: LinqCollection<number>,
	students: LinqCollection<Student>,
	courses: LinqCollection<Course>,
	registrations: LinqCollection<Registration>
) {
	standardTest(numbers)
	studentsTest(students, courses, registrations)
}
