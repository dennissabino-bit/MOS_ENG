# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev        # Start Vite dev server
npm run build      # Production build (primary validation step)
npm run lint       # ESLint
npm run typecheck  # tsc --noEmit (faster type check without emitting)
npm run preview    # Preview production build locally
```

There are no tests. `npm run build` is the primary validation step.

## Environment

Requires a `.env` file with:
```
VITE_SUPABASE_URL=...
VITE_SUPABASE_ANON_KEY=...
```

## Architecture

**Stack:** React 18 + TypeScript + Vite + Tailwind CSS + Supabase + React Router v6. No state management library — all state is local `useState`/`useEffect` with custom hooks.

### Routing (`src/App.tsx`)

| Route | Page |
|---|---|
| `/` | Dashboard |
| `/obras` | Obras list |
| `/obras/:id` | ObraDetail (5 tabs) |
| `/fornecedores` | Fornecedores |
| `/cotacoes` | Cotações |
| `/usuarios` | Usuarios |

### Data layer

**Supabase tables** (all typed in `src/lib/database.types.ts`):
`obras`, `etapas_eap`, `medicoes`, `fornecedores`, `cotacoes`, `usuarios`, `fluxo_financeiro`, `cronograma_etapas`, `curva_s`, `diario_obra`

**Hooks:**
- `useObras` — fetches all `obras` from Supabase; exposes `obras`, `loading`, `addObra`, `updateObraImagem`, `refetch`
- `useDashboardData(filters)` — fetches `etapas_eap` (nivel=sub) + `medicoes` filtered by `obraId`; computes `kpis` (totalOrcado, totalRealizado, saldo) and `fluxoData` (monthly distribution) in-memory
- `useObraData(obra, etapas, medicoes)` — pure computation hook (no fetching); derives `kpis`, `fluxo`, `curvaS`, `cronogramaFromEtapas` from already-fetched arrays; `ObraDetail` feeds it

**Mock data still in use:** `src/lib/mockData.ts` exports `mockDiario` and `mockCotacoes` which are used in `ObraDetail` for the Diario tab and cotações count. All other data (obras, etapas, medicoes) comes from Supabase.

### ObraDetail data flow

```
ObraDetail (fetches obra + etapas_eap + medicoes from Supabase)
  └─ useObraData(obra, etapas, medicoes)  ← pure computation
       ├─ kpis   → VisaoGeralTab, OrcamentoTab
       ├─ fluxo  → VisaoGeralTab > FluxoBarChart
       ├─ curvaS → VisaoGeralTab > CurvaSChart, CronogramaTab
       └─ cronogramaFromEtapas → CronogramaTab
```

`OrcamentoTab` receives `obra`, `etapas`, `kpis`, and `onEtapasChange`. KPI cards display `kpis.totalOrcado`/`kpis.totalRealizado` computed from real etapas/medicoes. The `totalGeral` row sums all `sub`-level etapas (optionally filtered by category).

### Financial flow computation

`buildFluxoFromEtapasMedicoes` / `buildFluxoFromData` distribute each `sub`-level etapa's `valor_total` evenly across every calendar month between `data_inicio` and `data_fim`. If `data_fim` is missing, the full value lands in the start month. Realized values are placed in the month of `data_medicao`.

### Design tokens (Tailwind)

| Token | Usage |
|---|---|
| `mos-700` (`#610000`) | Primary brand colour — buttons, active states, accents |
| `surface-0/1/2/3` | White → light grey backgrounds |
| `text-primary/secondary/tertiary/disabled` | Text hierarchy |
| `status-{success,warning,error,info}` + `Light` suffix | Semantic colours |
| `chart-orcado` (`#d1d5db`) / `chart-realizado` (`#610000`) | Bar chart colours |

**Font roles:** `font-display` (Manrope) for headings, `font-body` (Work Sans) for UI text, `font-data` (Inter) for numbers/codes.

**Component utility classes** (defined in `src/index.css`): `.card`, `.btn-primary`, `.btn-secondary`, `.nav-item`, `.nav-item-active`, `.skeleton`, `.badge-saudavel`, `.badge-alerta`, `.badge-erro`.

### Formatters (`src/lib/formatters.ts`)

- `formatCurrency` — abbreviated (e.g. `R$ 1,5M`, `R$ 500k`)
- `formatCurrencyMi` — abbreviated with "mi" suffix
- `formatCurrencyFull` — full BRL locale string
- `formatDate(isoString)` — `"Jan/25"` style
- `formatMonthYear(mes, ano)` — same from numeric month/year

### EAP structure

`EtapaEap` has two levels: `nivel === 'macro'` (section headers) and `nivel === 'sub'` (line items with `quantidade × valor_unitario = valor_total`). Budget KPIs and fluxo always aggregate from `sub` items only. Categories: `infraestrutura | superestrutura | instalacoes | acabamentos | extra`.
