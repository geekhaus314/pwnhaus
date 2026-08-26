# Polyglot services

Three small backend components expose the same contract:

```text
GET /health
200 application/json
{"service":"...","status":"ok","runtime":"..."}
```

Run one at a time:

```sh
cd rust && cargo run
cd go && go run .
cd ruby && ruby app.rb
```

The services intentionally use lightweight standard-library servers so each runtime
can be evaluated independently before introducing framework-specific dependencies.

