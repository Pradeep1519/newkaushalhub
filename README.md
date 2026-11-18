# KaushalHub NaukriPath

A responsive multi-page website with a Node.js server for KaushalHub NaukriPath. The shared logo is in `kaushalhub-logo.svg`.

## Included pages

- Home
- AI workshops catalogue
- Student registration
- Institutional programmes
- Partnerships & sponsorship
- Upcoming events
- Campus impact
- About us
- Contact
- Admin dashboard

## Requirements

Node.js 18 or newer. No third-party packages are required.

## Run locally

```bash
npm start
```

Open http://localhost:3000. Use `PORT` to change the port and `HOST` to change the bind address.

## Server features

- Serves the existing site pages and static assets.
- Saves student registrations and contact, institutional, and partnership enquiries in `data/submissions.json`.
- Provides `GET /api/health`, `POST /api/registrations`, and `POST /api/enquiries`.
- Validates submissions and limits JSON request bodies to 16 KB.
- Does not expose saved submissions through the public website.

The local JSON file contains personal information. Keep it private and out of source control; `data/` is gitignored. Back it up and apply appropriate access and retention controls before production use.

## Important limitations

- Registration records are saved with payment status `pending`. No payment is collected or verified; configure and verify a payment provider before confirming paid registrations.
- The admin page is a static preview, not an authenticated administration system.
- Form submissions are stored locally; the server does not send confirmation emails.
- No event listings are published until confirmed event details are provided.
- Workshop catalogue content is maintained in `script.js`.

## Tests

```bash
npm test
```
