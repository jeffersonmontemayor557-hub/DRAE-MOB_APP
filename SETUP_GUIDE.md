# DRAE MobApp on another PC (from Google Drive)

Download the shared folder from Drive and unzip it anywhere you like. You do not need XAMPP; only Node.js matters for running this project.

Install Node.js LTS from [nodejs.org](https://nodejs.org/). For the phone app, install Expo Go on your phone (Play Store or App Store) so you can scan the QR code after you start the dev server.

The project already includes the env files you need, so you can go straight to the commands.

Open a terminal in the mobile app folder and run:

```text
cd path\to\unzipped\DRAE MobApp\drae-mobapp-app
npm install
npm start
```

Scan the QR with Expo Go. If it will not connect, use the same Wi‑Fi as the PC or pick tunnel in the Expo window.

For the admin site, open another terminal:

```text
cd path\to\unzipped\DRAE MobApp\drae-admin-web
npm install
npm run dev
```

Open the localhost link it prints (often port 5173).

If `npm install` ever looks wrong, delete any `node_modules` folders and run `npm install` again. Full Supabase setup from scratch is in `drae-mobapp-app\SUPABASE_SETUP.md` if you are creating a new backend, not just opening an existing one.
