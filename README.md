# Campus Gigs

Private demo setup for the campus task marketplace.

## Run it

1. Install backend deps in [backend/package.json](C:\Users\arnbn\Desktop\Useful\projects\microservices\microservices\campus-gigs\backend\package.json) and frontend deps in [frontend/package.json](C:\Users\arnbn\Desktop\Useful\projects\microservices\microservices\campus-gigs\frontend\package.json).
2. Start the backend from [backend/server.js](C:\Users\arnbn\Desktop\Useful\projects\microservices\microservices\campus-gigs\backend\server.js) with `npm run dev`.
3. Start the frontend from [frontend/package.json](C:\Users\arnbn\Desktop\Useful\projects\microservices\microservices\campus-gigs\frontend\package.json) with `npm run dev`.

## Shared Dev Config

The repo includes [backend/.env](C:\Users\arnbn\Desktop\Useful\projects\microservices\microservices\campus-gigs\backend\.env) for the shared private development setup, plus [backend/.env.example](C:\Users\arnbn\Desktop\Useful\projects\microservices\microservices\campus-gigs\backend\.env.example) as a reference copy.

## Demo Data

Run `npm run seed` inside [backend/package.json](C:\Users\arnbn\Desktop\Useful\projects\microservices\microservices\campus-gigs\backend\package.json) to top the shared Supabase database up to 100 open demo tasks.

Demo login:

- Email: `alex.chen@gatech.edu`
- Password: `password123`
