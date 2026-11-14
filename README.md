# RSU Mart

A mobile-first marketplace for discovering businesses around RSU, built with
Next.js, React, and MongoDB.

## Run locally

1. Install Node.js 20 or newer.
2. Install dependencies with `npm install`.
3. Copy `.env.example` to `.env.local`.
4. Set `MONGODB_URI` to your MongoDB connection string.
5. Add your OPay sandbox merchant ID, public key, and secret key as
   `OPAY_MERCHANT_ID`, `OPAY_PUBLIC_KEY`, and `OPAY_SECRET_KEY`. Keep
   `OPAY_MODE=sandbox` while testing.
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

To test seller access locally without OPay credentials, sign in, open
`/seller`, and choose **Activate free test seller (development only)**. This
in-memory test activation is unavailable outside `next dev` and is cleared
when the server restarts.

Never commit `.env.local` or payment credentials. Use OPay sandbox keys for
testing. In the OPay merchant dashboard, configure the webhook URL as
`https://<your-domain>/api/webhooks/opay`. The app verifies OPay callback
signatures and independently checks the payment status with OPay before
marking seller onboarding as paid. You need an OPay merchant account with API
access before checkout can be used; without its keys, payment initialization
returns a configuration error.

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
   - `OPAY_MODE` — set to `sandbox` while testing.
   - `OPAY_MERCHANT_ID`, `OPAY_PUBLIC_KEY`, and `OPAY_SECRET_KEY` — use your
     OPay sandbox credentials initially. Keep all keys server-side.
5. In Atlas **Network Access**, configure access for your Vercel deployment.
   Vercel may use dynamic outbound IPs; if your plan has no static egress, Atlas
   may require `0.0.0.0/0`. If so, protect the database with a strong,
   least-privilege database user. Never expose the connection string in
   browser code.
6. Set the final `NEXT_PUBLIC_SITE_URL` before deploying to production, then
   deploy with `vercel --prod`. Production and the OPay callback require
   HTTPS.
7. In OPay, configure the webhook URL as
   `https://your-production-domain/api/webhooks/opay`. Use test keys and
   test transactions while validating the setup.
8. Test account registration and sign-in, then test seller checkout using
   OPay's sandbox. Seller access is unlocked only after the exact ₦5,000 NGN
   payment is verified with OPay.
9. When ready to accept real payments, obtain OPay production approval and
   credentials, set `OPAY_MODE=live` and update the server-side keys in Vercel,
   configure the production OPay webhook, and redeploy.

Changing Vercel environment variables does not update an existing deployment;
redeploy after changing them.

## Accounts and seller payments

Users can register and sign in at `/login`. Passwords are bcrypt-hashed;
sessions are random, revocable, stored as hashes in MongoDB, and sent in
HttpOnly, SameSite cookies. Authentication and seller-payment endpoints check
the request origin and apply database-backed rate limits.

Seller onboarding starts at `/seller`. The ₦5,000 fee is initialized in NGN
through OPay hosted checkout. Payment details never pass through RSU Mart.
Successful status requires a server-to-server OPay verification with the
expected reference, amount, and currency. The same confirmation logic handles
the signed transaction-status webhook and the checkout return page. A successful
payment unlocks seller access. Sellers can create one shop; seller approval
workflows and refunds still need to be built.

Production deployment must use HTTPS and a production `NEXT_PUBLIC_SITE_URL`.
Keep OPay keys server-only; never prefix them with `NEXT_PUBLIC_`.

## Marketplace data

The storefront includes sample businesses and reads open shops from the
`shops` collection. Sellers with active seller access can create and edit one
shop at `/seller/shop`, choose a service category, add a banner image URL, and
customize colors, gradients, and font. Shop details are stored in MongoDB;
local development shops are held in memory. Banner images currently use public
HTTPS URLs; direct uploads and product listings are not part of this step.

Checkout for customer orders, inventory management, and live delivery booking
are not implemented yet.
