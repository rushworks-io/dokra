## SCRIPTS
Always use pnpm to run commands. 

- `pnpm install` - Install dependencies
- `pnpm run dev` - Run development server, check if there is already a server running on port 3000. If so, use it.
- `pnpm run build` - Build the app for production

## PROJECT STRUCTURE
- `dokra-application/` - Main application code. Refer to its `docs/REAMDE.md` for more details.
- `workers` - Cloudflare Workers code.
- `shared` - Shared code between `dokra-application` and `workers`.
  - `Database` - Database schema and migration scripts. Using DrizzleOrm
  - `Types` - Shared TypeScript types.

## Code structure
- use vue3 composition api Syntax
- place imports on top of the file
- don't add the `<style></style>` tags, unless really necessary 