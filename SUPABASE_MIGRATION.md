# Green Passport: Supabase migration

This deployment is intended for a **new isolated database**. Do not import or
modify the original Firebase or Google Sheets data.

## Before deployment

1. Open the new `green-passport-db` project in Supabase. In SQL Editor, run
   `supabase/migrations/001_green_passport.sql` once. It creates the database,
   RPC authorization, private Storage buckets and Realtime notifications in a
   single transaction. Review the SQL before running it. Do not run in the
   original project. If any statement fails, the transaction rolls back.
2. In Authentication > URL Configuration, set Site URL to
   `https://green-passport-saint-theresa.vercel.app`. Enable normal email
   confirmation. Do not expose service-role or database credentials to browsers.
3. Push the source and generated bundle. The Vercel project already has the
   Supabase production environment variables. `api/config.js` returns only the
   browser-safe URL and publishable key.
4. Register the first administrator with their real email address and confirm
   the email. The account starts unapproved. In the new database SQL Editor,
   choose the exact account and authorize it:

   ```sql
   -- Replace the placeholder with the administrator's verified email.
   update public.gp_profiles p
   set role = 'admin', approved = true
   from auth.users u
   where p.id = u.id and u.email = 'ADMIN_EMAIL_HERE';
   ```

   Never grant the administrator role to public self-registration. Approve
   students only after verifying their identity/class in the Admin page.

## Verification checklist

- [ ] Migration completed in the new database.
- [ ] Production configuration endpoint returns URL and publishable key only.
- [ ] New registration, email confirmation and pending account work.
- [ ] Admin can approve an account; a student cannot approve accounts or review records.
- [ ] Student uploads private evidence and only their own records are visible.
- [ ] Teacher reviews a record and moderates posts/comments.
- [ ] Chat messages arrive in two authorized browser sessions and private rooms reject unauthorized users.
- [ ] Game score sums are recomputed from bounded stage values. For competitive
  anti-cheat protection, the original client-side game must additionally move
  question/answer verification to a server-controlled attempt workflow.
- [ ] Verify that no app requests target the original Firebase or Sheets project.

The frontend keeps the existing UI and calls a compatibility adapter rather
than Google Apps Script. The migration is not yet tested against a live
Supabase database until step 1 and the verification checklist are complete.
