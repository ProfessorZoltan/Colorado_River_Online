# Simulation prototypes

Throwaway feasibility scripts from the balance review. They are kept for reference until the real
harness is built (see `docs/plans/02-balance-simulation-plan.md`).

- `prototype-sim.mjs` — headless Monte Carlo on the real engine. It is seeded by monkeypatching Math.random.
  `node tools/sim/prototype-sim.mjs [games=200] [policy=random|waterfirst] [factions=arizona,california,nevada]`
  Set `NOFF=1` to disable Firefighter A (exploit X1).
- `prototype-probe.mjs` — reproduces each confirmed exploit (X1–X6). It is the basis for the regression tests.
