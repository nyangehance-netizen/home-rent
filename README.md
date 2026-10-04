# Kodi — rentals app for Dar es Salaam (Android & iOS)

One app with three sides:

- **Tenants** browse homes, swipe through photos, request a viewing, and reserve with M-Pesa, Mixx by Yas, Airtel Money or HaloPesa.
- **Owners** list houses and apartments, upload photos from the gallery or camera, and confirm or decline requests.
- **Brokers (madalali)** get a personal broker code and list homes for owners. They track clients from *New lead → Viewing → Agreed → Moved in* and see the commission they have earned.

The app works in English and Kiswahili. Prices are in TSh, and phone numbers are Tanzanian (07xx / 06xx).

Built with **Expo SDK 57 (React Native)** for the app and **Supabase** for accounts, database, photo storage and payment functions.

---

## Get the Android app (APK) from GitHub

GitHub builds a new APK automatically every time code is pushed to `main`.

1. On your Android phone, open **https://github.com/nyangehance-netizen/home-rent/releases/latest**.
2. Tap the `kodi-….apk` file and open the download. If asked, allow your browser to **install unknown apps**.
3. To connect the app to your data, add two repository secrets on GitHub: **Settings → Secrets and variables → Actions → New repository secret**:
   - `EXPO_PUBLIC_SUPABASE_URL`: your Supabase project URL
   - `EXPO_PUBLIC_SUPABASE_KEY`: your Supabase anon / publishable key

   Then go to **Actions → Android APK → Run workflow** to build a new APK with them. Steps 1–3 below explain how to create the Supabase project.

Each build takes about 15–25 minutes. You can follow it under the **Actions** tab. New builds install over the old one, so your phone keeps your sign-in.

---

## What you need

| | Cost |
|---|---|
| A computer (Windows, Mac or Linux) with **Node.js 20 or newer** — download "LTS" from nodejs.org | Free |
| A **Supabase** account — supabase.com | Free plan is enough to start |
| An **Expo** account — expo.dev (builds the installable app in the cloud) | Free plan includes monthly builds |
| An Android phone to install the preview | — |
| *Only for iPhone:* Apple Developer Program | US$99 / year |
| *Only to publish on Google Play:* Google Play developer account | US$25 once |

---

## Step 1 — Create the backend (about 10 minutes)

1. Go to **supabase.com**, then **New project**. Pick a region close to Tanzania, for example *Frankfurt (eu-central-1)*. Save the database password somewhere safe.
2. When the project is ready, open **SQL Editor → New query**.
3. Open the file `supabase/migrations/20261004000000_init.sql` in a text editor, copy everything, paste it into the SQL editor and click **Run**. You should see *Success*. This creates all tables, the security rules and the photo storage.
4. While testing, open **Authentication → Sign In / Providers → Email** and turn **off** "Confirm email". People can then sign up and use the app immediately. Turn it back on before launch.
5. Open **Project Settings → API** (or **API Keys**) and copy:
   - the **Project URL**
   - the **anon / publishable** key. **Never** use the *service_role / secret* key in the app.

## Step 2 — Connect the app to the backend

In the project folder, copy `.env.example` to a new file named `.env` and paste in your values:

```
EXPO_PUBLIC_SUPABASE_URL=https://abcdefgh.supabase.co
EXPO_PUBLIC_SUPABASE_KEY=eyJhbGciOi...
```

## Step 3 — Install and deploy the payment function

Open a terminal (Command Prompt or PowerShell on Windows, Terminal on Mac) in the project folder:

```bash
npm install
npx supabase login
npx supabase link --project-ref YOUR-PROJECT-REF      # the "abcdefgh" part of your project URL
npx supabase functions deploy start-payment
npx supabase functions deploy payment-callback --no-verify-jwt
```

Payments start in **test mode**. Reserving a home goes through the whole flow, including the receipt, but no real money moves. See Step 7 to switch on real mobile money.

## Step 4 — Install it on your Android phone (preview build)

```bash
npm install -g eas-cli
eas login                     # your expo.dev account
eas init                      # links this folder to a new Expo project (answer "yes")
npm run build:android-preview
```

The build runs on Expo's servers and takes roughly 10–20 minutes. At the end, the terminal shows a **link and a QR code**.

1. Scan the QR code with your Android phone's camera, or open the link on the phone.
2. Download the `.apk` file and tap it.
3. If Android asks, allow your browser to **"Install unknown apps"**. Then tap **Install**.

You can send the same link to friends to test the app on their Android phones.

> When you change the app's code later, run `npm run build:android-preview` again and reinstall.

### Quicker previews while you edit (optional)

```bash
npx expo start
```

Scan the QR code with the **Expo Go** app. This reloads instantly as you edit files. If Expo Go says the project needs a different SDK version, use the APK build above instead.

## Step 5 — iPhone

Apple doesn't allow installing apps from a link without a paid developer account. With the **Apple Developer Program** (US$99/year):

```bash
eas device:create              # register your iPhone (open the link it shows on the iPhone)
npm run build:ios-preview      # sign in with your Apple ID when asked
```

Open the link the build shows on your iPhone to install. To share with more testers, use TestFlight (see Step 6).

## Step 6 — Publish to Google Play and the App Store

1. Before the first store build, change the app ID in `app.json` if you want your own: `"package": "tz.kodi.app"` for Android and `"bundleIdentifier": "tz.kodi.app"` for iOS. It cannot be changed after you publish.
2. Build and submit:

```bash
eas build --platform android --profile production   # makes an .aab for Google Play
eas submit --platform android

eas build --platform ios --profile production       # makes an iOS build
eas submit --platform ios                           # uploads to App Store Connect / TestFlight
```

3. In the Play Console and App Store Connect, fill in the store listing: screenshots, description, privacy policy URL and content rating. Then send the app for review.

## Step 7 — Turn on real mobile money (AzamPay)

The app uses **AzamPay**, which supports M-Pesa, Mixx by Yas (Tigo), Airtel Money and HaloPesa, to send a USSD push to the tenant's phone.

1. Apply for an AzamPay merchant account and get sandbox credentials (app name, client ID, client secret, API key).
2. Make up a long random callback secret, then set these on Supabase:

```bash
npx supabase secrets set PAYMENT_MODE=azampay \
  AZAMPAY_APP_NAME=... AZAMPAY_CLIENT_ID=... AZAMPAY_CLIENT_SECRET=... AZAMPAY_API_KEY=... \
  CALLBACK_SECRET=some-long-random-text
```

3. In the AzamPay portal, set the callback URL to:
   `https://YOUR-PROJECT-REF.supabase.co/functions/v1/payment-callback?secret=some-long-random-text`
4. Test with sandbox money. Check that the callback marks the payment as paid. The function accepts AzamPay's common field names, but confirm against the docs AzamPay gives you.
5. When AzamPay approves you for live payments, also set `AZAMPAY_AUTH_URL` and `AZAMPAY_API_URL` to the live addresses they give you.

---

## Try the whole flow

1. On the phone, **Create account** as an **Owner**. Add a property, then tap **Add from gallery** or **Take photo**. Tap a photo to label it (Bedroom, Kitchen…) or make it the cover.
2. Sign out and create a **Broker** account. Note your broker code on the Clients tab, for example `HAMISI2285`.
3. Sign out and create a **Tenant** account. Open the owner's home and swipe through the photos. Tap **Reserve with mobile money**, enter the broker code and pay. Test mode approves it straight away.
4. Sign in as the broker. The tenant is in **Agreed**, and the pending commission (one month's rent) shows on **Earnings**. Move them to **Moved in** to count it as earned.
5. Sign in as the owner. The reservation is under **Inquiries**, marked paid and showing which broker brought the client.

## How the money rules work

- **Reserve:** the tenant pays one month's rent through mobile money. It counts toward the advance (usually 3, 6 or 12 months).
- **Broker commission:** one month's rent, paid by the owner when the client moves in. Tenants pay no broker fee on Kodi. To change these rules, edit the `broker_commissions` view in the SQL file and the text in `src/lib/i18n.tsx`.

## Before a public launch

- Turn "Confirm email" back on in Supabase, or switch to phone-number login with SMS. Supabase supports this through Twilio, MessageBird or Vonage.
- Add a way to approve brokers and mark listings **Verified**. Right now the `verified` flag can only be set from the Supabase dashboard.
- Add push notifications for new inquiries.
- Write a privacy policy. Both stores require one.

## Project layout

```
app/                  screens (file name = route)
  sign-in, sign-up
  tenant/             Explore, My requests, Profile
  owner/              Properties, Inquiries, Profile
  broker/             Clients, Listings, Inquiries, Earnings, Profile
  listing/[id]        home details + photo gallery
  viewing/[id]        request a viewing
  reserve/[id]        mobile money reservation
  property/edit       add/edit a home + photos
  client/new          broker adds a client
src/components        buttons, chips, photo carousel, listing card
src/lib               Supabase client, sign-in state, English/Kiswahili text, formatting
supabase/migrations   database, security rules, storage
supabase/functions    start-payment, payment-callback
```

## If something goes wrong

- **"The app is not connected to its database yet"**: the `.env` file is missing or has the wrong values. Fix it and rebuild.
- **Version warnings after `npm install`**: run `npm run fix-versions`.
- **Photos fail to upload**: check that the SQL file ran completely. The last part creates the `listing-photos` storage bucket.
- **Payment says "Could not start the payment"**: check that the `start-payment` function is deployed (Step 3).
