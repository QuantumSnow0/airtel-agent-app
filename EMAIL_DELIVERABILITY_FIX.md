# Email Deliverability Fix Guide

## Problem: Emails Going to Spam

Your password reset emails are being flagged as spam by Gmail/email clients. This is caused by:

1. Missing email authentication (SPF, DKIM, DMARC records)
2. Unprofessional email templates
3. Using default Supabase email sender (low reputation)
4. Missing proper email headers

## Solution: Fix Email Deliverability

### Step 1: Configure Custom SMTP with Proper Service

**Don't use the default Supabase email service for production.** Use a reputable email service provider:

#### Option A: SendGrid (Recommended - Free tier available)

1. **Sign up for SendGrid** (free tier: 100 emails/day)

   - Go to [sendgrid.com/free](https://sendgrid.com/free/)
   - Create an account

2. **Verify Your Sender Email**

   - Go to **Settings** → **Sender Authentication**
   - Click **"Verify a Single Sender"**
   - Add: `noreply@airtel5grouter.co.ke` (or your preferred email)
   - Verify the email address

3. **Create API Key**

   - Go to **Settings** → **API Keys**
   - Create API Key with **"Mail Send"** permissions
   - Copy the API key (you won't see it again!)

4. **Configure in Supabase**
   - Go to **Supabase Dashboard** → **Authentication** → **Settings**
   - Scroll to **SMTP Configuration**
   - Enable **Custom SMTP**
   - Fill in:
     ```
     SMTP Host: smtp.sendgrid.net
     SMTP Port: 587
     SMTP User: apikey
     SMTP Password: [paste your SendGrid API key]
     SMTP Sender Email: noreply@airtel5grouter.co.ke
     SMTP Sender Name: Airtel Agents
     ```
   - Click **Save**

#### Option B: Mailgun (Alternative)

1. **Sign up for Mailgun** (free tier: 5,000 emails/month)
2. **Add and verify your domain** (`airtel5grouter.co.ke`)
3. **Get SMTP credentials** from Mailgun dashboard
4. **Configure in Supabase** with Mailgun SMTP settings

### Step 2: Set Up Email Authentication (SPF, DKIM, DMARC)

**This is CRITICAL to prevent spam flags!**

#### For Domain: `airtel5grouter.co.ke`

You need to add DNS records to your domain:

#### SPF Record (Prevents email spoofing)

Add a TXT record to your domain's DNS:

```
Type: TXT
Name: @ (or your domain name)
Value: v=spf1 include:sendgrid.net ~all
```

**Or if using Mailgun:**

```
Value: v=spf1 include:mailgun.org ~all
```

#### DKIM Record (Email signature verification)

Your email provider (SendGrid/Mailgun) will provide DKIM records:

- **SendGrid**: Go to **Settings** → **Sender Authentication** → **Domain Authentication** → Get DKIM records
- **Mailgun**: Go to **Sending** → **Domains** → Your domain → DNS records

Add the provided DKIM TXT records to your DNS.

#### DMARC Record (Email policy)

Add a DMARC TXT record:

```
Type: TXT
Name: _dmarc
Value: v=DMARC1; p=quarantine; rua=mailto:admin@airtel5grouter.co.ke
```

**Note:** Start with `p=quarantine` (soft fail). After monitoring, you can change to `p=reject` (hard fail).

### Step 3: Update Email Templates

The default Supabase templates are too plain and trigger spam filters. Use professional templates:

#### Password Reset Email Template

Go to **Supabase Dashboard** → **Authentication** → **Email Templates** → **Reset Password**

**Subject:**

```
Reset Your Airtel Agents Password
```

**HTML Body:**

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Reset Your Password</title>
  </head>
  <body
    style="font-family: Arial, sans-serif; line-height: 1.6; color: #333333; max-width: 600px; margin: 0 auto; padding: 20px;"
  >
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #0066CC; margin: 0;">Airtel Agents</h1>
    </div>

    <!-- Main Content -->
    <div
      style="background-color: #ffffff; border: 1px solid #e0e0e0; border-radius: 8px; padding: 30px; margin-bottom: 20px;"
    >
      <h2 style="color: #333333; margin-top: 0;">Reset Your Password</h2>

      <p>Hello,</p>

      <p>
        We received a request to reset your password for your Airtel Agents
        account. If you made this request, please click the button below to
        reset your password:
      </p>

      <!-- CTA Button -->
      <div style="text-align: center; margin: 30px 0;">
        <a
          href="{{ .ConfirmationURL }}"
          style="background-color: #0066CC; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;"
          >Reset Password</a
        >
      </div>

      <!-- Alternative Link -->
      <p style="font-size: 14px; color: #666666;">
        Or copy and paste this link into your browser:
      </p>
      <p
        style="font-size: 12px; color: #0066CC; word-break: break-all; background-color: #f5f5f5; padding: 10px; border-radius: 4px;"
      >
        {{ .ConfirmationURL }}
      </p>

      <!-- Security Notice -->
      <div
        style="background-color: #fff5f5; border-left: 4px solid #ff3b30; padding: 15px; margin: 20px 0; border-radius: 4px;"
      >
        <p style="margin: 0; font-size: 14px; color: #666666;">
          <strong>Security Notice:</strong> This link will expire in 1 hour. If
          you didn't request a password reset, please ignore this email. Your
          password will not be changed.
        </p>
      </div>

      <p>
        If you're having trouble clicking the button, copy and paste the URL
        above into your web browser.
      </p>

      <p>Best regards,<br /><strong>Airtel Agents Team</strong></p>
    </div>

    <!-- Footer -->
    <div
      style="text-align: center; font-size: 12px; color: #999999; margin-top: 30px;"
    >
      <p>This email was sent by Airtel Agents</p>
      <p>© 2024 Airtel Kenya. All rights reserved.</p>
    </div>
  </body>
</html>
```

**Plain Text Body:**

```
Reset Your Airtel Agents Password

Hello,

We received a request to reset your password for your Airtel Agents account. If you made this request, please click the link below to reset your password:

{{ .ConfirmationURL }}

This link will expire in 1 hour.

If you didn't request a password reset, please ignore this email. Your password will not be changed.

Best regards,
Airtel Agents Team

---
This email was sent by Airtel Agents
© 2024 Airtel Kenya. All rights reserved.
```

#### Email Verification Template

Go to **Email Templates** → **Confirm Signup**

**Subject:**

```
Verify Your Airtel Agents Email Address
```

**HTML Body:**

```html
<!DOCTYPE html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Verify Your Email</title>
  </head>
  <body
    style="font-family: Arial, sans-serif; line-height: 1.6; color: #333333; max-width: 600px; margin: 0 auto; padding: 20px;"
  >
    <!-- Header -->
    <div style="text-align: center; margin-bottom: 30px;">
      <h1 style="color: #0066CC; margin: 0;">Airtel Agents</h1>
    </div>

    <!-- Main Content -->
    <div
      style="background-color: #ffffff; border: 1px solid #e0e0e0; border-radius: 8px; padding: 30px; margin-bottom: 20px;"
    >
      <h2 style="color: #333333; margin-top: 0;">Welcome to Airtel Agents!</h2>

      <p>Hello,</p>

      <p>
        Thank you for registering with Airtel Agents! To complete your
        registration, please verify your email address by clicking the button
        below:
      </p>

      <!-- CTA Button -->
      <div style="text-align: center; margin: 30px 0;">
        <a
          href="{{ .ConfirmationURL }}"
          style="background-color: #0066CC; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;"
          >Verify Email Address</a
        >
      </div>

      <!-- Alternative Link -->
      <p style="font-size: 14px; color: #666666;">
        Or copy and paste this link into your browser:
      </p>
      <p
        style="font-size: 12px; color: #0066CC; word-break: break-all; background-color: #f5f5f5; padding: 10px; border-radius: 4px;"
      >
        {{ .ConfirmationURL }}
      </p>

      <!-- Expiry Notice -->
      <p style="font-size: 14px; color: #666666;">
        This verification link will expire in 24 hours.
      </p>

      <p>If you didn't create an account, please ignore this email.</p>

      <p>Best regards,<br /><strong>Airtel Agents Team</strong></p>
    </div>

    <!-- Footer -->
    <div
      style="text-align: center; font-size: 12px; color: #999999; margin-top: 30px;"
    >
      <p>This email was sent by Airtel Agents</p>
      <p>© 2024 Airtel Kenya. All rights reserved.</p>
    </div>
  </body>
</html>
```

### Step 4: Test Email Deliverability

After configuring everything:

1. **Send a test password reset email**
2. **Check the email:**

   - Should arrive in inbox (not spam)
   - No security warnings
   - Professional appearance
   - All links work

3. **Use email testing tools:**
   - [Mail Tester](https://www.mail-tester.com/) - Send test email and get spam score
   - [MXToolbox](https://mxtoolbox.com/spf.aspx) - Check SPF/DKIM/DMARC records
   - [Google Postmaster](https://postmaster.google.com/) - Monitor Gmail deliverability

### Step 5: Monitor and Improve

- **Monitor email logs** in SendGrid/Mailgun dashboard
- **Check spam rates** and delivery rates
- **Warm up the domain** if it's new (send small volumes initially)
- **Keep sender reputation high** by:
  - Only sending transactional emails (not marketing)
  - Not sending to invalid email addresses
  - Maintaining good engagement rates

## Quick Checklist

- [ ] Configure custom SMTP (SendGrid/Mailgun)
- [ ] Verify sender email address
- [ ] Add SPF record to DNS
- [ ] Add DKIM records to DNS
- [ ] Add DMARC record to DNS
- [ ] Update email templates with professional HTML
- [ ] Test email delivery
- [ ] Check spam scores (aim for < 5/10 on Mail Tester)
- [ ] Monitor email logs

## Common Issues and Solutions

### Issue: Still going to spam after SPF/DKIM setup

**Solution:**

- Wait 24-48 hours for DNS propagation
- Verify all DNS records are correct using MXToolbox
- Check if domain has bad reputation (blacklisted)
- Consider using a subdomain for emails (e.g., `mail.airtel5grouter.co.ke`)

### Issue: "This message might be dangerous" warning

**Solution:**

- This is Gmail's security warning - fixable with proper authentication
- Ensure SPF, DKIM, and DMARC are all properly configured
- Use a reputable email service provider (SendGrid, Mailgun)
- Professional email templates help avoid phishing flags

### Issue: Links not working in emails

**Solution:**

- Make sure deep link URL scheme is correct: `airtelagentsapp://reset-password`
- Test deep links on actual device (not just email client)
- Ensure app URL scheme is configured in `app.json`

## Next Steps

1. **Immediate**: Set up SendGrid and configure custom SMTP
2. **Today**: Add SPF record to DNS
3. **This week**: Add DKIM and DMARC records
4. **This week**: Update email templates
5. **Ongoing**: Monitor email deliverability

After following these steps, your emails should:

- ✅ Arrive in inbox (not spam)
- ✅ No security warnings
- ✅ Professional appearance
- ✅ High deliverability rate
