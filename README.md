# openapi-mcp-transformer
Transform OpenAPI specs into intelligent, context-aware MCP servers with autonomous decision-making capabilities

## Development utilities

Two helper scripts generate symbol mappings and refactor impact reports.

```bash
npm run generate:mappings       # outputs symbol-map.json
npm run refactor:impact <base> <target>
```

The first command creates a JSON list of each source file and its exported symbols using `ts-morph`.
The second command compares two mapping files and writes `refactor-impact.txt` describing added or removed symbols.
