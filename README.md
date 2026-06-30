# app-web

`app-web` is the Angular web frontend for Astrea-EIP.
It implements browser-facing user journeys, frontend integration with backend services, and web-specific build and test workflows.

## What belongs here

This repository owns:

- Angular pages, layouts, and components
- frontend state and browser-side integration
- web-specific tests and CI configuration
- local technical documentation for the web application

This repository does not own:

- backend business logic
- deployment environment state
- engine computation logic that belongs in `core-moteur`
- organization-wide engineering standards maintained in `docs`

## Local development

Use `pnpm` for local work.

```bash
pnpm install
pnpm start
```

Run quality checks locally:

```bash
pnpm lint
pnpm type-check
pnpm test --watch=false
pnpm build
```

## Documentation

Repository-specific documentation lives under `docs/`.
Cross-repository engineering rules live in the central handbook repository: `Astrea-EIP/docs`.
