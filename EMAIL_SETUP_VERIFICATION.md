# Email Setup Verification Guide

## Your Configuration

You're using:
- **Sender Email**: `admin@airtel5grouter.co.ke`
- **Email Service**: SendGrid or Mailgun (you configured)
- **Domain**: `airtel5grouter.co.ke`

## Step 1: Verify Supabase SMTP Configuration

1. **Go to Supabase Dashboard**
   - Navigate to **Authentication** → **Settings**
   - Scroll to **SMTP Configuration**
   
2. **Verify these settings are correct:**
   ```
   ✅ Enable Custom SMTP: ON
   ✅ SMTP Host: [smtp.sendgrid.net or smtp.mailgun.org]
   ✅ SMTP Port: 587
   ✅ SMTP User: [apikey for SendGrid or your Mailgun username]
   ✅ SMTP Password: [your API key/password]
   ✅ SMTP Sender Email: admin@airtel5grouter.co.ke
   ✅ SMTP Sender Name: Airtel Agents
   ```

3. **Test SMTP Connection** (if available in Supabase):
   - Look for a "Test Connection" or "Send Test Email" button
   - If available, click it and check if test email is received

## Step 2: Verify Email Templates Are Updated

1. **Go to Authentication** → **Email Templates**
2. **Check "Reset Password" template:**
   - Subject should be: `Reset Your Airtel Agents Password`
   - Body should contain professional HTML (not plain text)
   - Should include `{{ .ConfirmationURL }}` variable
   - Should have "Airtel Agents" branding

3. **Check "Confirm Signup" template:**
   - Subject should be: `Verify Your Airtel Agents Email Address`
   - Should also have professional HTML design

## Step 3: Test Password Reset Email

1. **In your app:**
   - Go to the login screen
   - Click "Forgot Password?"
   - Enter a test email address
   - Click "Send Reset Link"

2. **Check the email:**
   - ✅ Should arrive within 1-2 minutes
   - ✅ Should come from "Airtel Agents <admin@airtel5grouter.co.ke>"
   - ✅ Should have professional design (not plain text)
   - ✅ Should have a blue "Reset Password" button
   - ✅ Should NOT have security warnings
   - ✅ Should arrive in INBOX (not spam folder)

3. **Test the reset link:**
   - Click the "Reset Password" button in the email
   - Should open your app
   - Should navigate to reset password screen

## Step 4: Verify DNS Records (Critical for Deliverability)

### Check SPF Record

1. Go to [MXToolbox SPF Checker](https://mxtoolbox.com/spf.aspx)
2. Enter: `airtel5grouter.co.ke`
3. Click "SPF Record Lookup"
4. **Expected result:**
   ```
   ✅ Should show: v=spf1 include:sendgrid.net ~all
   OR
   ✅ Should show: v=spf1 include:mailgun.org ~all
   ```
5. **If missing or incorrect:**
   - Add/update TXT record in your DNS:
     - Name: `@`
     - Value: `v=spf1 include:sendgrid.net ~all` (or mailgun.org)

### Check DKIM Record

**If using SendGrid:**
1. Go to SendGrid Dashboard → **Settings** → **Sender Authentication**
2. Click **"Authenticate Your Domain"** (or check existing domain)
3. Copy the DKIM TXT records provided
4. Add them to your DNS as TXT records
5. Wait for verification (can take up to 48 hours)

**If using Mailgun:**
1. Go to Mailgun Dashboard → **Sending** → **Domains**
2. Click on your domain
3. View DNS records needed
4. Add DKIM records to your DNS

**Verify DKIM:**
- Use [MXToolbox DKIM Checker](https://mxtoolbox.com/dkim.aspx)
- Enter your domain and selector (provided by email service)

### Check DMARC Record

1. Go to [MXToolbox DMARC Checker](https://mxtoolbox.com/dmarc.aspx)
2. Enter: `airtel5grouter.co.ke`
3. **Expected result:**
   ```
   ✅ Should show: v=DMARC1; p=quarantine; rua=mailto:admin@airtel5grouter.co.ke
   ```
4. **If missing:**
   - Add TXT record to DNS:
     - Name: `_dmarc`
     - Value: `v=DMARC1; p=quarantine; rua=mailto:admin@airtel5grouter.co.ke`

## Step 5: Test Email Deliverability

### Use Mail Tester (Recommended)

1. Go to [mail-tester.com](https://www.mail-tester.com)
2. Copy the test email address provided (e.g., `test-xxxxx@mail-tester.com`)
3. **In Supabase Dashboard:**
   - Go to **Authentication** → **Users**
   - Find or create a test user
   - Click "Send reset password email" (use the mail-tester email)
4. **In Mail Tester:**
   - Click "Check Score" after sending
5. **Expected results:**
   - ✅ **Spam Score**: Should be **< 5/10** (lower is better)
   - ✅ **SPF**: Should show ✅ (pass)
   - ✅ **DKIM**: Should show ✅ (pass)
   - ✅ **DMARC**: Should show ✅ (pass)
   - ✅ **Blacklist**: Should show no blacklists

### Check Google Postmaster (For Gmail Deliverability)

1. Sign up at [Google Postmaster Tools](https://postmaster.google.com/)
2. Verify your domain `airtel5grouter.co.ke`
3. Monitor:
   - Spam rate (should be < 0.1%)
   - IP reputation
   - Domain reputation

## Step 6: Common Issues and Quick Fixes

### Issue 1: Email Still Going to Spam

**Check:**
- [ ] SPF record is correct and propagated (check with MXToolbox)
- [ ] DKIM is set up and verified
- [ ] DMARC record exists
- [ ] Email templates are professional (not plain text)
- [ ] Sender email is verified in SendGrid/Mailgun

**Fix:**
- Wait 24-48 hours for DNS propagation
- Verify all DNS records are correct
- Ensure email service shows domain/email as verified

### Issue 2: "This message might be dangerous" Warning

**Cause:** Missing or incorrect email authentication

**Fix:**
1. Verify SPF, DKIM, and DMARC are all correctly configured
2. Wait for DNS propagation (24-48 hours)
3. Use a reputable email service (SendGrid/Mailgun)
4. Ensure sender email is verified

### Issue 3: Email Not Sending at All

**Check:**
- [ ] SMTP settings are correct in Supabase
- [ ] API key/password is correct
- [ ] Email service account is active (not suspended)
- [ ] Check Supabase logs: **Authentication** → **Logs**

**Fix:**
- Verify SMTP credentials
- Check email service dashboard for errors
- Test SMTP connection manually if possible

### Issue 4: Reset Link Not Working

**Check:**
- [ ] Deep link URL is correct: `airtelagentsapp://reset-password`
- [ ] App URL scheme is configured in `app.json`
- [ ] Test on actual device (not email client)

**Fix:**
- Verify `app.json` has: `"scheme": "airtelagentsapp"`
- Test deep link on device after reinstalling app
- Check if app opens when clicking email link

## Step 7: Monitor Email Deliverability

### Daily Checks (First Week)

1. **Check Supabase Logs:**
   - Go to **Authentication** → **Logs**
   - Look for email sending errors
   - Check for rate limit warnings

2. **Check Email Service Dashboard:**
   - SendGrid: Check delivery stats
   - Mailgun: Check delivery logs
   - Look for bounce rates (should be < 5%)
   - Look for spam complaints (should be 0%)

3. **Test Emails:**
   - Send test password reset to your personal email
   - Verify it arrives in inbox
   - Check for any warnings

### Weekly Checks

1. Review spam scores (Mail Tester)
2. Check Google Postmaster (if set up)
3. Review bounce rates
4. Check for any blacklist issues

## Success Criteria

Your email setup is working correctly when:

✅ **Emails arrive in inbox** (not spam folder)
✅ **No security warnings** ("dangerous message" banner)
✅ **Professional appearance** (HTML template, branding)
✅ **All links work** (reset link opens app)
✅ **Spam score < 5/10** (on Mail Tester)
✅ **SPF, DKIM, DMARC all pass** (verified with tools)
✅ **No bounce errors** (in email service dashboard)

## Quick Verification Checklist

- [ ] SMTP configured in Supabase
- [ ] Sender email verified (`admin@airtel5grouter.co.ke`)
- [ ] Email templates updated (professional HTML)
- [ ] SPF record added to DNS
- [ ] DKIM record added to DNS
- [ ] DMARC record added to DNS
- [ ] Test password reset email sent successfully
- [ ] Email arrives in inbox (not spam)
- [ ] No security warnings
- [ ] Reset link works (opens app)
- [ ] Mail Tester score < 5/10
- [ ] All DNS records verified with MXToolbox

## Next Steps After Verification

1. **If everything works:**
   - ✅ Setup complete! Monitor for first week
   - ✅ Keep an eye on delivery rates
   - ✅ Respond to any user reports of missing emails

2. **If still having issues:**
   - Check the specific issue in "Common Issues" section above
   - Wait 24-48 hours for DNS propagation
   - Contact your email service provider support if needed
   - Consider using a subdomain for emails (e.g., `mail.airtel5grouter.co.ke`)

## Need Help?

If you're still experiencing issues after following this guide:

1. **Check Supabase Logs:**
   - Authentication → Logs
   - Look for specific error messages

2. **Check Email Service Dashboard:**
   - SendGrid/Mailgun logs will show detailed errors

3. **Verify DNS Records:**
   - Use MXToolbox to verify all records are correct
   - Wait 24-48 hours for propagation

4. **Test with Mail Tester:**
   - Get specific spam score and feedback
   - Fix issues based on their recommendations


