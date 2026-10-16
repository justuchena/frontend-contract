# Security

This project is one local developer script and a set of Markdown files. The
checker makes no network requests, has no dependencies required or optional,
and reads only the directory you point it at. It never writes to your source —
the one file it writes is the baseline you ask for with `--write-baseline`.

Two places where a report would nonetheless be worth making:

- **`enforce/frontend-check.mjs` reads a baseline file as JSON**, and resolves
  the paths inside it against the directory being checked. If you find a path
  in a baseline that can make the checker read or write outside that
  directory, that is a bug worth reporting.
- **`--since <ref>` shells out to `git diff`** with the ref you supply. It goes
  through `execSync` with the ref interpolated, so if you find a ref that
  escapes into the shell, report it rather than opening a public issue.

Unlike a linter, this checker does not load a config file, so there is no
path by which it executes your code.

## Reporting

Use GitHub's private vulnerability reporting on this repository
(**Security → Report a vulnerability**), or contact @justuchena on GitHub.

Please do not open a public issue for something exploitable. For anything
else — a crash, a false positive, a wrong receipt — a normal issue is right.

## Supported versions

The `main` branch. This project has no release branches to backport to.
