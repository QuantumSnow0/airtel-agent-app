# Custom SMTP Setup Guide for Airtel Agents App

This guide will help you configure custom SMTP in Supabase so emails are sent from your domain/email instead of Supabase's default service.

## Why Custom SMTP?

- **Branding**: Emails come from your domain (e.g., noreply@airtelagents.com)
- **Deliverability**: Better email delivery rates (less spam)
- **Professional**: Looks more professional to users
- **Control**: Full control over email content and design
- **Limits**: Higher email sending limits

## Quick Start: Gmail (Testing)

### Step 1: Create Gmail App Password

1. Go to your Google Account: https://myaccount.google.com
2. Click **Security** → **2-Step Verification** (enable if not already)
3. Go to **App Passwords**: https://myaccount.google.com/apppasswords
4. Select:
   - **App**: Mail
   - **Device**: Other (Custom name) → Enter "Supabase"
5. Click **Generate**
6. **Copy the 16-character password** (you'll need this!)

### Step 2: Configure in Supabase

1. Go to **Supabase Dashboard** → Your Project
2. Navigate to **Authentication** → **Settings**
3. Scroll to **SMTP Configuration**
4. Fill in:
   ```
   Enable Custom SMTP: ✅ ON
   SMTP Host: smtp.gmail.com
   SMTP Port: 587
   SMTP User: your-email@gmail.com
   SMTP Password: [paste the app password from Step 1]
   SMTP Sender Email: your-email@gmail.com
   SMTP Sender Name: Airtel Agents
   ```
5. Click **"Save"**

### Step 3: Test

1. Go to **Authentication** → **Users**
2. Click **"Send verification email"** on any user
3. Check your email - should come from "Airtel Agents <your-email@gmail.com>"

---

## Production: SendGrid (Recommended)

### Step 1: Create SendGrid Account

1. Go to [sendgrid.com](https://sendgrid.com/free/)
2. Sign up for free account (100 emails/day)
3. Verify your email address

### Step 2: Create API Key

1. In SendGrid Dashboard, go to **Settings** → **API Keys**
2. Click **"Create API Key"**
3. Name it: "Supabase Email"
4. Permissions: Select **"Mail Send"** (full access)
5. Click **"Create & View"**
6. **Copy the API key** immediately (you won't see it again!)

### Step 3: Verify Sender

**Option A: Single Sender Verification (Quick)**
1. Go to **Settings** → **Sender Authentication**
2. Click **"Verify a Single Sender"**
3. Fill in your details:
   - Email: noreply@yourdomain.com (or your email)
   - Name: Airtel Agents
   - Company: Airtel Kenya
   - Address: [Your address]
4. Click **"Create"**
5. Check your email and click the verification link

**Option B: Domain Authentication (Recommended for Production)**
1. Go to **Settings** → **Sender Authentication**
2. Click **"Authenticate Your Domain"**
3. Follow the DNS configuration steps
4. Add DNS records to your domain provider

### Step 4: Configure in Supabase

1. Go to **Supabase Dashboard** → **Authentication** → **Settings**
2. Scroll to **SMTP Configuration**
3. Fill in:
   ```
   Enable Custom SMTP: ✅ ON
   SMTP Host: smtp.sendgrid.net
   SMTP Port: 587
   SMTP User: apikey
   SMTP Password: [paste your SendGrid API key from Step 2]
   SMTP Sender Email: noreply@yourdomain.com (or verified sender)
   SMTP Sender Name: Airtel Agents
   ```
4. Click **"Save"**

### Step 5: Test

1. Register a new agent in your app
2. Check email - should come from "Airtel Agents <noreply@yourdomain.com>"
3. Check spam folder if not received

---

## Alternative: Mailgun

### Step 1: Create Mailgun Account

1. Go to [mailgun.com](https://www.mailgun.com/)
2. Sign up for free account (5,000 emails/month)
3. Verify your email

### Step 2: Add Domain

1. Go to **Sending** → **Domains**
2. Click **"Add New Domain"**
3. Enter your domain (e.g., airtelagents.com)
4. Select **"Send emails"** (not receiving)
5. Click **"Add Domain"**

### Step 3: Verify Domain

1. Mailgun will provide DNS records to add
2. Add these records to your domain's DNS:
   - TXT record for domain verification
   - TXT record for SPF
   - MX record (if receiving emails)
   - CNAME records for tracking
3. Click **"Verify DNS Settings"**
4. Wait for verification (can take up to 48 hours, usually faster)

### Step 4: Get SMTP Credentials

1. Once domain is verified, go to **Sending** → **Domain Settings**
2. Scroll to **SMTP credentials**
3. Note the SMTP settings:
   - Host: smtp.mailgun.org (or smtp.eu.mailgun.org for EU)
   - Port: 587 or 465
   - Username: postmaster@your-domain.mailgun.org
   - Password: [your Mailgun password]

### Step 5: Configure in Supabase

1. Go to **Supabase Dashboard** → **Authentication** → **Settings**
2. Scroll to **SMTP Configuration**
3. Fill in Mailgun settings:
   ```
   Enable Custom SMTP: ✅ ON
   SMTP Host: smtp.mailgun.org
   SMTP Port: 587
   SMTP User: postmaster@your-domain.mailgun.org
   SMTP Password: [your Mailgun password]
   SMTP Sender Email: noreply@yourdomain.com
   SMTP Sender Name: Airtel Agents
   ```
4. Click **"Save"**

---

## Customize Email Templates

After configuring SMTP, customize your email templates:

1. Go to **Authentication** → **Email Templates**
2. Select **"Confirm signup"** template
3. Customize with your branding:

**HTML Template Example:**
```html
<h2>Welcome to Airtel Agents!</h2>
<p>Thank you for registering with Airtel Agents.</p>
<p>Please click the button below to verify your email address:</p>
<p>
  <a href="{{ .ConfirmationURL }}" style="background-color: #0066CC; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">
    Verify Email Address
  </a>
</p>
<p>Or copy and paste this link into your browser:</p>
<p>{{ .ConfirmationURL }}</p>
<p>This link will expire in 24 hours.</p>
<p>If you didn't create an account, please ignore this email.</p>
<p>Best regards,<br>Airtel Agents Team</p>
```

4. Click **"Save"**
5. Test by sending a verification email

---

## Troubleshooting

### Emails Not Sending?

1. **Check SMTP Settings**: Verify all credentials are correct
2. **Test Connection**: Use Supabase's "Test Email" feature if available
3. **Check Logs**: Go to **Authentication** → **Logs** to see errors
4. **Verify Sender**: Make sure sender email is verified in your SMTP provider
5. **Check Spam**: Check spam folder - emails might be there

### Gmail Issues?

- Make sure you're using **App Password**, not your regular password
- Enable **2-Step Verification** first
- Check "Less secure app access" is OFF (use App Passwords instead)

### SendGrid Issues?

- Make sure API key has **"Mail Send"** permissions
- Verify sender email is authenticated
- Check API key is correct (no spaces, copied fully)
- Check you're not in sandbox mode (if using domain auth)

### Mailgun Issues?

- Verify domain is fully verified (all DNS records added)
- Wait 24-48 hours for DNS propagation
- Check domain status in Mailgun dashboard
- Make sure you're using correct SMTP endpoint (US vs EU)

---

## Recommended Setup for Production

**Best Practice:**
1. Use **SendGrid** or **Mailgun** (not Gmail for production)
2. Verify your **own domain** (not just email)
3. Set up **SPF, DKIM, and DMARC** records
4. Customize email templates with your branding
5. Monitor email delivery rates
6. Set up email analytics

**Sender Email:**
- Use: `noreply@yourdomain.com` or `notifications@yourdomain.com`
- Don't use: `info@`, `support@` (these might receive replies)

---

## Next Steps

After configuring SMTP:
- [ ] Test email sending
- [ ] Customize email templates
- [ ] Set up domain authentication (for production)
- [ ] Configure SPF/DKIM records (for better deliverability)
- [ ] Monitor email logs
- [ ] Set up email analytics (optional)

