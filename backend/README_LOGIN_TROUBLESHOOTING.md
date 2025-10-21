Login troubleshooting notes (dev):

- The backend accepts username (ten_dn) and email. Lookups are case-insensitive.
- Frontend normalizes the username to lowercase before sending.
- Seeded demo credentials:
  - admin / Admin@123
  - gv001 / Teacher@123
  - lt001 / Monitor@123
  - 2021003 / Student@123

If login fails:
1) Check server health: http://localhost:3001/health
2) Ensure DB seed ran: `npm run seed` in backend
3) Verify request body shape: `{ maso: '<username-or-email>', password: '<password>' }`
4) Confirm JWT secret between `.env` and server matches current running process.
