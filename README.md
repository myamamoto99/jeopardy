# Jeopardy (Next.js)

This project now runs on Next.js using the App Router.

## Scripts

- `yarn dev` starts the development server
- `yarn build` creates a production build
- `yarn start` runs the production server
- `yarn lint` runs ESLint
- `yarn clean` removes build output

## Notes

- The game UI and logic remain in `src/`.
- Next entry files are in `app/`.
- GitHub Pages deploy workflow is in `.github/workflows/deploy-gh-pages.yml`.
- Static export is enabled via `next.config.mjs` and outputs to `out/`.
