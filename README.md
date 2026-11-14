# RSU Mart

A mobile-first marketplace for discovering businesses around RSU, built with
Next.js, React, and MongoDB.

## Run locally

1. Install Node.js 20 or newer.
2. Install dependencies with `npm install`.
3. Copy `.env.example` to `.env.local`.
4. Set `MONGODB_URI` to your MongoDB connection string.
5. Add your Paystack **test** secret key as `PAYSTACK_SECRET_KEY`.
6. Set `NEXT_PUBLIC_SITE_URL` to the origin serving the app (locally,
   `http://localhost:3000`).
7. Start the development server with `npm run dev`.
8. Open [http://localhost:3000](http://localhost:3000).

While `next dev` is running, registration and sign-in use temporary
development-only accounts held in memory, so you can explore authenticated
screens without connecting MongoDB. These accounts and sessions are lost when
the server restarts. Production always requires MongoDB; the temporary mode
cannot be enabled there. Payment and other database-backed features still
require MongoDB.

Never commit `.env.local` or live payment credentials. Use Paystack test keys
for local development. In the Paystack dashboard, configure the webhook URL as
`https://<your-domain>/api/webhooks/paystack`. The app verifies webhook
signatures and independently verifies transactions against Paystack before
marking seller onboarding as paid.

## Deploy to Vercel

You can deploy from this folder using the Vercel CLI; a GitHub repository is
optional.

1. Create a MongoDB Atlas cluster and database user. Give the user a strong,
   unique password.
2. Create a Vercel account and install the Vercel CLI with
   `npm install --global vercel`.
3. From the project folder run `vercel` and follow the prompts to sign in and
   create/link the Vercel project. Accept the detected Next.js settings.
4. In the Vercel project dashboard, open **Settings → Environment Variables**
   and add the following for Production (and Preview if desired):
   - `MONGODB_URI` — your Atlas connection string.
   - `MONGODB_DB` — `rsu_mart`.
   - `NEXT_PUBLIC_SITE_URL` — the exact HTTPS origin you will use, such as
     `https://your-project.vercel.app` (no trailing slash).
   - `PAYSTACK_SECRET_KEY` — use your Paystack **test** secret initially.
5. In Atlas **Network Access**, configure access for your Vercel deployment.
   Vercel may use dynamic outbound IPs; if your plan has no static egress, Atlas
   may require `0.0.0.0/0`. If so, protect the database with a strong,
   least-privilege database user. Never expose the connection string in
   browser code.
6. Set the final `NEXT_PUBLIC_SITE_URL` before deploying to production, then
   deploy with `vercel --prod`. Production and the Paystack callback require
   HTTPS.
7. In Paystack, configure the webhook URL as
   `https://your-production-domain/api/webhooks/paystack`. Use test keys and
   test transactions while validating the setup.
8. Test account registration and sign-in, then test seller checkout with
   Paystack's test payment details. Seller access is unlocked only after the
   exact ₦5,000 NGN payment is verified with Paystack.
9. When ready to accept real payments, replace the test secret with the live
   secret in Vercel, configure the live Paystack webhook, and redeploy. Never
   prefix the Paystack secret with `NEXT_PUBLIC_`.

Changing Vercel environment variables does not update an existing deployment;
redeploy after changing them.

## Accounts and seller payments

Users can register and sign in at `/login`. Passwords are bcrypt-hashed;
sessions are random, revocable, stored as hashes in MongoDB, and sent in
HttpOnly, SameSite cookies. Authentication and seller-payment endpoints check
the request origin and apply database-backed rate limits.

Seller onboarding starts at `/seller`. The ₦5,000 fee is initialized in NGN
through Paystack hosted checkout. Card details never pass through RSU Mart.
Successful status requires a server-to-server Paystack verification with the
expected reference, amount, and currency. The same confirmation logic handles
the signed `charge.success` webhook and the checkout return page. A successful
payment unlocks seller access; shop setup, seller approval workflows, and
refunds still need to be built.

Production deployment must use HTTPS and a production `NEXT_PUBLIC_SITE_URL`.
Keep the Paystack secret server-only; never prefix it with `NEXT_PUBLIC_`.

## Marketplace data

The storefront currently uses sample businesses for its visual preview. The
`GET /api/shops` endpoint reads open businesses from the `shops` collection and
orders them by daily orders. Documents should include `name`, `category`, and
`isOpen`; optional display fields include `description`, `image`, `rating`,
`dailyOrders`, and `deliveryEstimate`.

Checkout for customer orders, inventory management, and live delivery booking
are not implemented yet.
