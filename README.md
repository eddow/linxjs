# LinqQs-JS

LINQ Query Syntax for javascript.

## What ?

```js
linq`from s in ${students} orderby s.age descending, s.name select s.name`
```

This was correct JS syntax and now has a meaningful value.

### Differences with C# linq

First, everything is in a "string" definition, so it's not compiled but interpreted at run-time. Pure code can appear in `${...}` and the in-string code is JS code - so we don't enjoy such strong typing (yet?)

### Why ?

For now, the "in-mem" executor is implemented (the one using `Array.filter` and `Array.sort`) though the purpose at long term is to have it connected to some ORM/GraphQL/... as possible.

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

No, the library does not parse JS. It stops at linq keywords to delimitate what might be JS code and use `new Function` giving it code directly.

### Stages

- Parsing: Take the string fragments and arguments and create a list of `Transformations` along a selection
- This information can be interpreted. As stated before, here, only the in-memory interpretation is implemented.
- Profit
