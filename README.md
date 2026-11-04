# Verticals In One View

we are it team we need to build this we have 8 verticles each verticle head will fill they data each verticle need one login and official need one login as dashboard to view all these and one admin login to make changes and all

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://verticals-in-one-view.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/4f887230-683a-48c2-a402-3ec22f7359f5).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Needs Node.js 22. No Docker needed: a throwaway local Postgres runs from npm.

```sh
npm install
npm run db:local                 # terminal 1: local Postgres on port 54329 (data in .pgdata/)
cp .env.example .env.local       # terminal 2
export DATABASE_URL=postgres://postgres:postgres@localhost:54329/nium
npm run db:migrate
npm run dev                      # then open /setup to create the first admin
```

`npm run build && npm start` runs the production build (`.output/server/index.mjs`, port 3000).

## Deploying

The app runs on AWS (EC2 + RDS PostgreSQL + CloudFront). See [infra/aws/README.md](infra/aws/README.md), which also covers moving the existing data out of Supabase.
