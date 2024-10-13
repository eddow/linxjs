# LinqQs-JS

LINQ Query Syntax for javascript.

## What ?

```js
from`s in ${students} order by s.age descending, s.name select s.name`
```

This was correct JS syntax and now has a meaningful value.

### Differences with C# linq

First, everything is in a "string" definition, so it's not compiled but interpreted at run-time. Pure code can appear in `${...}` and the in-string code is JS code - so we don't enjoy such strong typing (yet?)

Function names are re-cased - ie., `camelCase` is used instead of `PascalCase`

## How ?

This JS syntax :

```js
prefix`someString ${someValue} andSoOn`
```

allows the function prefix to receive these arguments :

- The string fragments (here: `"someString "` and `" andSoOn"`)
- The _values_ given (here `someValue`) without going through the string process - the received value is directly the object

The linq parser is therefore a parser going through these two lists at the same time.

### JS parsing

No, the library does not necessarily parse JS. It certainly parses linq keywords to delimitate what might be JS code and use `new Function` giving it code directly.

The functions might be either executed (ex. `MemCollection`) or parsed (ex. `SqlCollection`) depending on how to use it

### Stages

- 1: Collect of panties (Take the string fragments and arguments and create a list of `Transformations` along a selection) - Occurs on `from``...`` ` call
- 2: ? (it depends on the `LinqCollection` implementation used) - Occurs on iterating the result (SQL query, in-memory sorting/filtering/&c., ...)
- 3: Profit

### Implemented functionalities

The implementations (in-memory/sql) are done in the collection.

```ts
function firstOf(LinqCollection<T> c) {
	return from`x in ${c} where x... select x...`.first()
}
```

The behavior of calling `firstOf` (filter/sql call/...) will be determined by the class of `c`

## Usage

### Collection creation

```ts
interface Student {
	name: string
	age: number
}
```

#### In-memory

`@linxjs/mem` provides `memCollection<T>(data: Iterable<T> | AsyncIterable<T>)` that allows to provide data directly

```ts
import memCollection from '@linxjs/mem'

const students = memCollection<Student>([
	{ name: 'John', age: 21 },
	{ name: 'Melissa', age: 20 }
])
```

#### Sql

`@linx/sql` uses `knex` to specify a database.

```ts
import knex from 'knex'
import sqlCollection from '@linxjs/sql'

const db = knex(dbConfig)
const students = sqlCollection<Student>(db, 'students')
```
