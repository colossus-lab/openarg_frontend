# Create new data connector: $ARGUMENTS

Create a new data connector for the specified source. Follow these steps:

## 1. Create the connector file

Create `src/lib/connectors/$ARGUMENTS.ts` following existing connector patterns.

Primary reference: `src/lib/connectors/ckan.ts` and `src/lib/connectors/seriesTiempo.ts`.

The connector must:
- Export async functions that return `DataResult[]` (import from `./types.ts`)
- Handle errors with try/catch and return empty arrays on failure
- Use native `fetch` with timeout (15 seconds)
- Include `User-Agent: OpenArg/1.0` headers

Typical structure:
```typescript
import { DataResult } from './types';

export async function queryNewConnector(params: { ... }): Promise<DataResult[]> {
  // 1. Build URL
  // 2. Fetch with timeout
  // 3. Parse response
  // 4. Map to DataResult[]
}
```

## 2. Wire into the Data Agent

Edit `src/lib/agents/dataAgent.ts`:

1. Import the function from the new connector
2. Add a new `case` in the `executeStep()` switch with the action type (e.g. `query_$ARGUMENTS`)
3. Map plan step params to the connector function params

Reference: look for existing cases like `search_ckan`, `query_series`, `query_ddjj`.

## 3. Update types

In `src/lib/agents/types.ts`:
- Add the new action type to the `ActionType` type union (if it exists) or document it in the `PlanStep` comments

## 4. Update the Planner prompt

In `src/lib/agents/planner.ts`:
- Add the new data source to the SYSTEM_PROMPT, in the available sources section
- Describe what data it provides and when to use it
- Include the action type and expected params

## 5. Re-export (optional)

If there's a barrel export in `src/lib/connectors/index.ts`, add the re-export.

## Checklist
- [ ] Connector returns `DataResult[]`
- [ ] Wired into `dataAgent.ts` with its action type
- [ ] Planner knows it exists and when to use it
- [ ] Types are updated
- [ ] Handles errors without breaking the pipeline
