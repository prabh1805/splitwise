# Splitwise frontend

React + TypeScript + Vite, styled with Tailwind CSS v4.

## Run

Start the three backend services first (user-group on 8082, expense on 8080, balance on 8081), then:

```
npm install
npm run dev
```

Open http://localhost:5173. The dev server proxies `/api/v1/*` to the right service (see `vite.config.ts`),
so the backends don't need CORS.

## Notes

- Tokens: login returns an access token and a refresh token, both kept in `localStorage`. On a `401` the client
  refreshes once and retries. Refresh tokens are single-use, so concurrent refreshes share one request.
- The current user's id comes from the access token's `sub` claim.
- The backend has no group, member or user-lookup APIs yet, so groups are opened by ID, people are shown as
  `User #id`, and a payment's receiver confirms it by looking up the settlement ID.
- Balances are updated asynchronously through Kafka, so they can lag a new expense by a few seconds.
