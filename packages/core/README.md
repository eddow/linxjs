# LinqQs-JS core

The core by itself contains

- The parsing functionality
- Several helper functions
- The definition of the abstract `LinqCollection<T>` that needs to be defined by instances

## LinqCollection<T>

(`T` being the element of the collection)

Implements the whole Linq functionality - some functions are given (ex. `orderBy`) but others are "asked" (declared `abstract`, like `order` who takes a list of orderings)
