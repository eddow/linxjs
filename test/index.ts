import { LinqCollection } from '@linxjs/core'
import numbersTest from './numbers'
import studentsTest, { type Student, type Course, type Registration } from './students'
export { type Student, type Course, type Registration }

export function allTests(
	numberTables: { numbers?: LinqCollection<number> },
	students: LinqCollection<Student>,
	courses: LinqCollection<Course>,
	registrations: LinqCollection<Registration>
) {
	describe('numbers', () => {
		numbersTest(numberTables)
	})
	describe('students', () => {
		studentsTest(students, courses, registrations)
	})
}

/* TODO
- x in [A, B]
- dates
*/
