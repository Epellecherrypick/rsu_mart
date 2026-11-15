# RSU Mart

A mobile-first marketplace for discovering businesses around RSU, built with
Next.js, React, and MongoDB.

## Run locally

1. Install Node.js 20 or newer.
2. Install dependencies with `npm install`.
3. Copy `.env.example` to `.env.local`.
4. Set `MONGODB_URI` to your MongoDB connection string.
5. Set `SELLER_TRANSFER_BANK_NAME`, `SELLER_TRANSFER_ACCOUNT_NAME`, and
   `SELLER_TRANSFER_ACCOUNT_NUMBER` to the receiving account details.
6. Set `ADMIN_EMAILS` to your admin sign-in email and configure a private,
   random `ADMIN_SETUP_TOKEN`. Do not share or commit the setup token.
7. Set `PASSWORD_RESET_EMAIL` to `null17868@gmail.com` and
   `PASSWORD_RESET_EMAIL_APP_PASSWORD` to a Google App Password for that
   account. Enable 2-Step Verification and create an App Password in Google
   Account settings; do not use or share the account's normal password.
8. Set `NEXT_PUBLIC_SITE_URL` to the origin serving the app (locally,
   `http://localhost:3000`).
9. Start the development server with `npm run dev`.
10. Open [http://localhost:3000](http://localhost:3000).

While `next dev` is running, registration and sign-in use temporary
development-only accounts held in memory, so you can explore authenticated
screens without connecting MongoDB. These accounts and sessions are lost when
the server restarts. Production always requires MongoDB; the temporary mode
cannot be enabled there. Payment and other database-backed features still
require MongoDB.

To test seller access locally without a bank transfer, sign in, open
`/seller`, and choose **Activate free test seller (development only)**. This
in-memory test activation is unavailable outside `next dev` and is cleared
when the server restarts.

Seller onboarding uses a fixed bank account and a unique transfer narration
code. Codes expire two hours after creation. An admin must check the deposit
in the receiving account and approve it at `/admin/transfers`; approval
unlocks seller shop setup. OPay API credentials and webhooks are not used for
this manual transfer flow.

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
   - `SELLER_TRANSFER_BANK_NAME`, `SELLER_TRANSFER_ACCOUNT_NAME`, and
     `SELLER_TRANSFER_ACCOUNT_NUMBER` — the fixed receiving account.
   - `ADMIN_EMAILS` — comma-separated admin sign-in email allowlist.
   - `ADMIN_SETUP_TOKEN` — a long random secret used once to activate admin
     access. Set the same secret in your local environment and Vercel; never
     put it in browser code or commit it.
   - `PASSWORD_RESET_EMAIL` — `null17868@gmail.com`, the Gmail address used to
     send password reset codes.
   - `PASSWORD_RESET_EMAIL_APP_PASSWORD` — a Google App Password for that
     account. Enable 2-Step Verification and create an App Password in Google
     Account settings; never use the account's normal password.
5. In Atlas **Network Access**, configure access for your Vercel deployment.
   Vercel may use dynamic outbound IPs; if your plan has no static egress, Atlas
   may require `0.0.0.0/0`. If so, protect the database with a strong,
   least-privilege database user. Never expose the connection string in
   browser code.
6. Set the final `NEXT_PUBLIC_SITE_URL` before deploying to production, then
   deploy with `vercel --prod`. Production must use HTTPS.
7. Register or sign in using the allowlisted admin email. On registration,
   enter the private setup token in the admin setup section; if the account
   already exists, visit `/admin/setup`. Review transfers at `/admin/transfers`.
8. Test the complete seller payment journey with a controlled transfer, then
   approve it from the admin queue. Expired transfer codes cannot be approved.

Changing Vercel environment variables does not update an existing deployment;
redeploy after changing them.

Password reset codes are valid for 10 minutes and allow up to five attempts.
Configure both email variables before using `/forgot-password`; set them in
`.env.local` to test email delivery locally.

## Accounts and seller payments

Users can register and sign in at `/login` and recover passwords at
`/forgot-password`. Passwords are bcrypt-hashed;
sessions are random, revocable, stored as hashes in MongoDB, and sent in
HttpOnly, SameSite cookies. Authentication and seller-payment endpoints check
the request origin and apply database-backed rate limits.

Seller onboarding starts at `/seller`. Sellers transfer ₦5,000 to the
configured account and include their unique code in the transfer narration.
The code is linked to their account and expires after two hours. An admin
manually matches the received amount and narration, then approves or rejects
the request. Only approval unlocks `/seller/shop`.

Production deployment must use HTTPS and a production `NEXT_PUBLIC_SITE_URL`.
Keep the admin setup token server-only; never prefix it with `NEXT_PUBLIC_`.

## Marketplace data

The storefront includes sample businesses and reads open shops from the
`shops` collection. Sellers with approved access can create and edit one shop
at `/seller/shop`, choose a service category, add a banner image URL, and
customize colors, gradients, and font. Shop details are stored in MongoDB;
local development shops are held in memory. Banner images currently use public
HTTPS URLs.

Checkout for customer orders, inventory management, and live delivery booking
are not implemented yet.
