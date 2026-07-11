# Phase 1: Context — Research Questions

> CRISPY-V Crispify Mode — Extracting contracts from PipPaper codebase
> Mode: crispify | Target: /Users/drutjes/Documents/development/PipPaper

## Purpose

These questions investigate WHAT EXISTS in the codebase — not what should be built.
The answers (Phase 2) form the factual basis for contract extraction (Phase 4).

## Questions

### Q1: Data Model & Identity
1. What are the core domain entities and their fields (including optionality)?
2. What is the primary key for each entity? How are IDs generated?
3. What are the valid enum values for fields like `Side`, `NoteType`, `TagCategory`, `EntryReason`, `ExitReason`?
4. What is the relationship between Trade, Note, Setup, and Tag entities?

### Q2: Storage Layer
5. How does the storage layer persist data (KV key namespaces, value format)?
6. What transactions/atomic operations exist? Where are they NOT used but should be?
7. How is the 64KB KV value limit handled (chunking)?
8. Is there dead code in the storage layer? What is the ACTIVE vs LEGACY store?

### Q3: API Surface
9. What REST API endpoints exist? What are their request/response contracts?
10. What input validation exists on API routes? What is missing?
11. How are errors returned (status codes, body format)?
12. What side effects do API calls have (persistence, cache invalidation)?

### Q4: Business Logic & Invariants
13. How is PnL calculated? What formula is used?
14. How is the R-multiple calculated? What does it depend on?
15. How is `Side` (LONG/SHORT) determined when missing?
16. What is the semantics of `AdjustedCost` (sign convention)?
17. How is profit factor, win rate, expectancy, and streak calculated?
18. What is the dedup logic for trade imports?

### Q5: External Integrations
19. How does the AI Coach work (providers, models, prompt structure)?
20. How does the Kline/market data fetching work (auth, interval selection, symbol mapping)?
21. What environment variables and configuration cascades exist?
22. How does the backup export/import format work?

### Q6: MCP Server
23. What tools does the MCP server expose?
24. What protocol does it use? How does it authenticate?

### Q7: Cross-Cutting Concerns
25. What date/time conventions are used (unix seconds, ISO strings, YYYY-MM-DD)?
26. What numeric nullability exists (which fields can be null vs zero)?
27. Are there any concurrency concerns (race conditions, atomic guarantees)?
28. What is the Fresh framework's SSR data flow (handler → page → island)?

---

**Next:** Phase 2 (Research) answers each of these with objective codebase facts.
