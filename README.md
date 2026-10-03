# Birthday celebration site

## Local setup

1. Install Node.js 20 or newer and MySQL 8 or newer.
2. Copy `.env.example` to `.env`, then set the MySQL connection, admin credentials, a private `GALLERY_PASSWORD`, a long random `SESSION_SECRET`, the public `PUBLIC_SITE_URL`, and Gmail `MAIL_USERNAME` / `MAIL_PASSWORD`. For Gmail, use an app password with 2-Step Verification enabled. Never commit `.env`. The configured MySQL account needs permission to create the `Birthday` database and tables.
3. Start the API in one terminal:

   ```powershell
   npm run backend
   ```

   The backend creates the `Birthday` database and its tables on startup.

4. Start Vite in another terminal:

   ```powershell
   npm run dev
   ```

5. Open the Vite URL and visit `/admin`. The first successful admin sign-in initializes the database with the starter birthday content.

## Storage and publishing

The application code is separated into `frontend/` and `backend/`. Photos, albums, memories, timeline entries, birthday messages, and songs use separate MySQL tables. Settings have their own table. Uploaded photos and audio are stored as files under `backend/uploads`; the database stores their URLs and record details. Uploaded images are served only to visitors with a valid gallery session, opened using `GALLERY_PASSWORD`; uploaded audio remains publicly accessible. Images hosted by third parties, including the Unsplash starter images, are not protected by this passcode.

Each record has a `visible` setting. Public API responses include only visible records. Visible birthday messages appear in the wishes section, with featured messages shown first. Public pages check for changes every five seconds.

In Admin Settings, add the email recipients for the birthday notification. When the enabled countdown reaches its reveal time, the server sends one Happy Birthday email per configured deadline with the public site link and `GALLERY_PASSWORD`. The backend must remain running for delivery; if it is offline at the deadline, it sends after the backend starts again. Recipient addresses are kept separate from public site content.

For production, build the frontend and run the Node server:

```powershell
npm run build
npm start
```

Keep `.env` and `backend/uploads` private and persistent on the host. Use a dedicated MySQL account with access only to the `Birthday` database rather than the MySQL root account. Set `NODE_ENV=production` and a strong, stable `SESSION_SECRET` when deploying over HTTPS.
