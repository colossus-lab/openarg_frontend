# Adjust agent: $ARGUMENTS

Modify the behavior of the specified agent. Available agents:

| Agent | File | Phase |
|-------|------|-------|
| planner | `src/lib/agents/planner.ts` | 1 - Planning |
| dataAgent | `src/lib/agents/dataAgent.ts` | 2 - Data collection |
| analysisAgent | `src/lib/agents/analysisAgent.ts` | 3 - Analysis |
| memoryAgent | `src/lib/agents/memoryAgent.ts` | 4 - Memory |

## Steps

### 1. Identify what to modify

Read the corresponding agent file. Each agent has:
- **SYSTEM_PROMPT** — LLM behavior instructions
- **Main function** — Execution logic (generatePlan, executeDataCollection, analyzeData, updateMemory)
- **Model config** — Temperature, max tokens, structured output

### 2. Modify the SYSTEM_PROMPT

If the change is about behavior/response:
- The prompt is a string literal in each file
- Modify instructions while keeping the existing format
- Don't change the expected output structure without updating types

### 3. Modify the logic

If the change is about processing:
- **planner.ts**: How the query is decomposed into steps (ExecutionPlan)
- **dataAgent.ts**: How steps are executed and connectors are called
- **analysisAgent.ts**: How data is processed and charts/markdown are generated
- **memoryAgent.ts**: What is stored in context between turns

### 4. Verify types

If you changed input/output structure, update `src/lib/agents/types.ts`:
- `ExecutionPlan`, `PlanStep` — planner output
- `CollectedData`, `DataResult` — data agent output
- `AnalysisResult`, `ChartData` — analysis output
- `MemoryContext` — memory state

### 5. Verify the orchestrator

If the change affects how phases communicate, review `src/app/api/chat/route.ts` — that's where the 4 phases are chained and SSE events are handled.

## Checklist
- [ ] SYSTEM_PROMPT is consistent with the change
- [ ] Types in `types.ts` reflect any structural changes
- [ ] Orchestrator (`route.ts`) is not broken by the changes
- [ ] Modified phase still returns the format expected by the next phase
