# Contributing to OpenArg Frontend

## Getting Started
1. Fork the repository
2. Clone your fork
3. Copy `.env.local.example` to `.env.local` and configure
4. Run `npm install`
5. Run `npm run dev`

## Development Workflow
1. Create a feature branch: `git checkout -b feature/my-feature`
2. Make your changes
3. Run `npm run lint` and `npx tsc --noEmit`
4. Commit with a meaningful message
5. Push and open a PR

## Code Style
- TypeScript strict mode (no `any` types)
- Components: functional with hooks
- Naming: PascalCase for components, camelCase for functions/variables

## Reporting Issues
- Use GitHub Issues
- For security issues, see SECURITY.md
