# Add new CKAN portal: $ARGUMENTS

Add a new CKAN open data portal to the system. Follow these steps:

## 1. Add to the PORTALS array

Edit `src/lib/connectors/ckan.ts` and add an entry to the `PORTALS[]` array:

```typescript
{
  id: '$ARGUMENTS',
  name: 'Portal display name',
  baseUrl: 'https://portal-url/api/3/action',
  description: 'Brief description'
}
```

Reference: look for the `PORTALS` array at the top of `ckan.ts` — it has 10 active portals (Nacional, CABA, Buenos Aires, Córdoba, Santa Fe, Mendoza, Entre Ríos, Neuquén Ejecutivo, Neuquén Legislatura, Diputados).

## 2. Verify CKAN compatibility

Before adding, verify that the portal:
- Responds to `{baseUrl}/package_search?q=test&rows=1`
- Returns JSON with standard CKAN structure (`result.results[]`)
- Supports `resource_show` and resource downloads

If the portal requires authentication or has a custom API, it may need a separate connector (use `/new-connector` instead).

## 3. Update the Planner prompt

Edit `src/lib/agents/planner.ts`:
- Add the new portal to the list of available CKAN portals in the SYSTEM_PROMPT
- Describe what kind of data this portal has (e.g. "budget data from Tucumán")

## 4. Test

1. Verify `searchDatasets()` returns results for the new portal
2. Verify `queryDatastore()` works if the portal supports datastore
3. Run a test query that should use the new portal

## Checklist
- [ ] Portal added to `PORTALS[]` in `ckan.ts`
- [ ] Base URL verified (responds to package_search)
- [ ] Planner prompt updated with the new portal
- [ ] Tested with a real search query
