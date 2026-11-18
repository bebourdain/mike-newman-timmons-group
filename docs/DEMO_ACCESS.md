# Temporary demo access

The demo code signs in one existing active account. Choose an account with the intended role and dataset access.

Generate a credential from the repository directory with the existing auth secret loaded.

```powershell
node --env-file=.env --env-file=.env.local scripts/issue-demo-access.cjs designated-account@example.com
```

Share the generated code privately. Configure the three generated DEMO_ACCESS environment variables on the server. Store the digest and deadline in the environment. The default duration is 24 hours; pass an optional duration in days (1–31) after the email to issue longer access. The credential is reusable until its deadline. Five failed guesses lock that credential across browsers. Issuing a new credential creates a new attempt counter. Changing an existing deadline also requires recomputing the digest with the existing code, because the deadline is signed.

Restart the local server or redeploy after configuring the variables. The sign-in page shows Enter demo while the configuration is valid. Successful login creates a normal Better Auth session whose initial expiry is the demo deadline.

To end access early, remove the demo configuration, restart or redeploy, and revoke existing sessions for the designated account. Removing configuration prevents further demo logins. Use the app's existing admin session controls to revoke sessions.

Verification counters use the existing Verification table. No database migration is needed.
