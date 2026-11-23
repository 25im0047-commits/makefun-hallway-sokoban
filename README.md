# Hallway Sokoban

An independent-room, push-optimal Sokoban search written for
[Build the best Sokoban solver](https://make.fun/bounty/sokoban-solver-01-run-20261121).
The solver splits the generated layout along the hallway, uses A* with a
box-to-goal assignment lower bound in each room, and walks a shortest route
to the start of each selected push.

## Run

Use Node.js 22. The input consists of one XSB `level.txt` file per instance
directory. The solver writes a legal LURD move sequence to `solution.txt`
in each corresponding output directory.

```bash
MAKEFUN_INPUT_DIR=/path/to/input MAKEFUN_OUTPUT_DIR=/path/to/output node main.ts
```

With no overrides, the directories are `/input` and `/output`.
