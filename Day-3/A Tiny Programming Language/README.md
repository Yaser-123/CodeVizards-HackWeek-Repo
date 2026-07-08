# VibeScript 🕶️

VibeScript is a brand new, innovative programming language that uses modern internet slang for its keywords. It is a fully functioning interpreted language written from scratch in Python, featuring its own Lexer, Parser, and AST Evaluator.

## Features
- Variable assignments (`snatched`)
- While loops (`keep_cooking`)
- Conditional logic (`sus`, `cap sus`, `cap`)
- Mathematical expressions and comparisons
- Printing to the terminal (`spill`)

## How to Run

You don't need any external dependencies. Just standard Python 3!

Run the FizzBuzz example:
```bash
.\vibe programs/fizzbuzz.vibe
```

Run the Fibonacci sequence example:
```bash
.\vibe programs/fibonacci.vibe
```

Run the Factorial calculator:
```bash
.\vibe programs/factorial.vibe
```

## Syntax Example (FizzBuzz)
```text
snatched limit = 15
snatched i = 1

keep_cooking i <= limit {
    sus i % 15 == 0 {
        spill "FizzBuzz"
    } cap sus i % 3 == 0 {
        spill "Fizz"
    } cap sus i % 5 == 0 {
        spill "Buzz"
    } cap {
        spill i
    }
    
    snatched i = i + 1
}
```
