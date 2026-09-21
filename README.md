# Syntax Sprint

A four-level sentence-unscrambling arcade game with character customization, companions, treasure chests, rankings, sound effects, and original music.

[Play Syntax Sprint](https://syntax-sprint-arcade.sjk29.chatgpt.site)

## Development

Install dependencies and build the Cloudflare Worker bundle:

```sh
pnpm install
pnpm build
```

The hosted app requires a D1 binding named `DB`. Set `ADMIN_PASSWORD` as a private runtime secret to enable the admin practice area. Never commit the real password; `.env.example` contains only a placeholder.

## Vercel + Supabase

The repository also supports deployment on Vercel with Supabase as its database:

1. Connect this repository to a Supabase project and enable production deployments from `main`.
2. Connect the same repository to a Vercel project.
3. Add `SUPABASE_URL` and either `SUPABASE_SECRET_KEY` or `SUPABASE_SERVICE_ROLE_KEY` as private Vercel environment variables. Set `ADMIN_PASSWORD` privately if the admin practice area is needed.

Migrations live in `supabase/migrations`. Vercel runs `node scripts/build.mjs`, serves `dist`, and exposes the game API through `api/[...route].js`. Each push to `main` triggers a new Vercel production deployment. The deployment sends `noindex` directives so it is intended to be shared by link rather than indexed by search engines.
