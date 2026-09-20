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
