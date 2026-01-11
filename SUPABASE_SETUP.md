# Supabase Setup Guide

This guide will help you set up Supabase for the Airtel Agents app.

## 1. Create a Supabase Project

1. Go to [https://app.supabase.com](https://app.supabase.com)
2. Sign up or log in
3. Click "New Project"
4. Fill in your project details:
   - **Name**: airtel-agents (or your preferred name)
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose closest to Kenya (or your deployment region)
5. Click "Create new project" and wait for it to initialize (2-3 minutes)

## 2. Get Your Supabase Credentials

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Find these values:
   - **Project URL**: `https://your-project-id.supabase.co`
   - **anon public key**: Long string starting with `eyJ...`
3. Copy both values - you'll need them next

## 3. Configure Environment Variables

1. In the root of your project (`airtel-agents-app/`), create a file named `.env`:

```env
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key-here
```

2. Replace the placeholders with your actual values from step 2

**Important**:

- The `.env` file is gitignored, so your keys won't be committed
- For production, you'll need to set these as environment variables in your deployment platform

## 4. Create the Database Schema

In your Supabase project dashboard:

1. Go to **SQL Editor**
2. Run this SQL to create the `agents` table:

```sql
-- Create agents table
CREATE TABLE IF NOT EXISTS agents (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  airtel_phone TEXT,
  safaricom_phone TEXT,
  town TEXT,
  area TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index on status for faster queries
CREATE INDEX IF NOT EXISTS idx_agents_status ON agents(status);

-- Create index on email for faster lookups
CREATE INDEX IF NOT EXISTS idx_agents_email ON agents(email);

-- Enable Row Level Security (RLS)
ALTER TABLE agents ENABLE ROW LEVEL SECURITY;

-- Create policy: Authenticated users can insert their own agent record during registration
CREATE POLICY "Users can insert own agent profile"
  ON agents
  FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Create policy: Agents can read their own data
CREATE POLICY "Agents can view own profile"
  ON agents
  FOR SELECT
  USING (auth.uid() = id);

-- Create policy: Agents can update their own data (before approval)
CREATE POLICY "Agents can update own profile before approval"
  ON agents
  FOR UPDATE
  USING (auth.uid() = id AND status = 'pending');

-- Create policy: Service role can do everything (for admin dashboard)
-- Note: This is handled via service role key, not RLS policies
```

## 5. Configure Email Authentication

1. Go to **Authentication** → **Providers** → **Email**
2. Enable "Enable email provider"
3. Configure email templates (optional):
   - Go to **Authentication** → **Email Templates**
   - Customize the "Confirm signup" template if needed
   - The default template includes the OTP code

## 6. Configure Email Settings (Important for OTP)

1. Go to **Authentication** → **URL Configuration**
2. Set **Site URL**: Your app's URL scheme with `://` at the end
   - **Where to find it**: Check `app.json` file in your project (line 8: `"scheme": "airtelagentsapp"`)
   - **For this app**: Use `airtelagentsapp://`
   - This is your app's deep linking URL scheme for redirecting back to your app
3. Add redirect URLs (optional, for deep linking):

   - `airtelagentsapp://verify-email` (for email verification redirects)
   - `airtelagentsapp://reset-password` (for password reset redirects, if needed)

   **Note**: Since we're handling OTP codes manually in the app (not using redirect links), these redirect URLs are optional. The Site URL is more important.

## 7. Configure Custom SMTP (Email Sending) - IMPORTANT! 📧

**IMPORTANT**: By default, Supabase sends emails from their own email service, which:

- Shows "noreply@supabase.co" as sender
- Has delivery limitations
- May go to spam
- Not suitable for production

**You need to configure custom SMTP** to send emails from your own domain/email.

### Option 1: Using Gmail (Easy - Good for Testing)

1. **Set up Gmail App Password**:

   - Go to your Google Account → Security
   - Enable 2-Step Verification (if not already enabled)
   - Go to App Passwords → Create a new app password
   - Select "Mail" and "Other (Custom name)"
   - Name it "Supabase" and copy the generated password

2. **Configure in Supabase**:
   - Go to **Authentication** → **Settings** → **SMTP Configuration**
   - Enter these settings:
     ```
     SMTP Host: smtp.gmail.com
     SMTP Port: 465 (SSL) or 587 (TLS)
     SMTP User: your-email@gmail.com
     SMTP Password: [the app password you just created]
     SMTP Sender Email: your-email@gmail.com
     SMTP Sender Name: Airtel Agents (or your preferred name)
     ```
   - Click **"Save"**

### Option 2: Using SendGrid (Recommended for Production)

1. **Sign up for SendGrid** (free tier: 100 emails/day):

   - Go to [sendgrid.com](https://sendgrid.com)
   - Create a free account
   - Verify your email

2. **Create an API Key**:

   - Go to Settings → API Keys
   - Click "Create API Key"
   - Name it "Supabase" and give it "Mail Send" permissions
   - Copy the API key (you won't see it again!)

3. **Configure in Supabase**:

   - Go to **Authentication** → **Settings** → **SMTP Configuration**
   - Enter these settings:
     ```
     SMTP Host: smtp.sendgrid.net
     SMTP Port: 587 (TLS)
     SMTP User: apikey
     SMTP Password: [your SendGrid API key]
     SMTP Sender Email: noreply@yourdomain.com (or verified sender)
     SMTP Sender Name: Airtel Agents
     ```
   - Click **"Save"**

4. **Verify Sender Identity**:
   - In SendGrid, go to Settings → Sender Authentication
   - Verify your sender email or domain

### Option 3: Using Mailgun (Good Alternative)

1. **Sign up for Mailgun** (free tier: 5,000 emails/month):

   - Go to [mailgun.com](https://mailgun.com)
   - Create a free account
   - Verify your domain

2. **Get SMTP Credentials**:

   - Go to Sending → Domain Settings
   - Find SMTP credentials (host, port, username, password)

3. **Configure in Supabase**:
   - Go to **Authentication** → **Settings** → **SMTP Configuration**
   - Enter Mailgun SMTP settings:
     ```
     SMTP Host: smtp.mailgun.org (or your domain's SMTP)
     SMTP Port: 587
     SMTP User: [from Mailgun settings]
     SMTP Password: [from Mailgun settings]
     SMTP Sender Email: noreply@yourdomain.com
     SMTP Sender Name: Airtel Agents
     ```
   - Click **"Save"**

### Option 4: Using AWS SES (For High Volume)

1. **Set up AWS SES**:

   - Go to AWS Console → Simple Email Service
   - Verify your domain/email
   - Move out of sandbox mode (request production access)

2. **Create SMTP Credentials**:

   - Go to SMTP Settings → Create SMTP Credentials
   - Copy the SMTP endpoint and credentials

3. **Configure in Supabase**:
   - Use the AWS SES SMTP endpoint and credentials
   - Set sender email and name

### Test Your SMTP Configuration

After configuring SMTP:

1. Go to **Authentication** → **Users**
2. Click **"Send verification email"** on a test user
3. Check if email is received
4. Verify sender shows your custom email/name

### Customize Email Templates

After SMTP is configured, customize email templates:

1. Go to **Authentication** → **Email Templates**
2. Select **"Confirm signup"** template
3. Customize the template with:
   - Your branding (colors, logo)
   - Your company name
   - Clear instructions
   - Professional design

**Example Template:**

```
Subject: Verify your Airtel Agents account

Hello,

Thank you for registering with Airtel Agents!

Please click the link below to verify your email address:

{{ .ConfirmationURL }}

This link will expire in 24 hours.

If you didn't create an account, please ignore this email.

Best regards,
Airtel Agents Team
```

4. Save the template
5. Test by sending a verification email

## 8. Configure Email OTP (One-Time Password) - OPTIONAL

**Note**: Since we're using confirmation links, OTP is not required. But if you want to enable it:

### Option 1: Enable Email OTP in Settings (Recommended)

1. Go to **Authentication** → **Providers** → **Email**
2. Make sure **Enable email provider** is ON
3. Look for **"Enable Email OTP"** or **"Use Email OTP"** toggle and turn it ON

   - This allows sending OTP codes instead of confirmation links
   - If you don't see this toggle, it might be in a different location or your Supabase version might handle it differently

4. **Configure Email Template for OTP**:
   - Go to **Authentication** → **Email Templates**
   - Select **"Confirm signup"** template
   - The template should include the OTP code/token
   - Default template should show: `{{ .Token }}` or `{{ .ConfirmationURL }}`
   - For OTP mode, you want it to display the code clearly (e.g., "Your verification code is: **{{ .Token }}**")

### Option 2: Alternative Approach (If OTP Toggle Not Available)

If you can't find the Email OTP toggle, Supabase might send OTP codes automatically when you use `resend()` with type "signup". The app will automatically request an OTP code after signup, but you may still receive the initial confirmation link email.

### How It Works in the App:

1. User signs up → Supabase sends email (confirmation link OR OTP depending on settings)
2. App automatically requests OTP code using `resend()` → Should send OTP code
3. User receives email with 6-digit code
4. User enters code in app → Code is verified

### Testing:

- If you receive a **confirmation link** in email → Email OTP is not enabled
- If you receive a **6-digit code** in email → Email OTP is working!

**If you're still getting confirmation links**, check:

- Authentication → Email Templates → Make sure template shows the code
- Try using the "Resend Code" button in the app - it should send an OTP code

## 8. Test the Setup

1. Restart your Expo development server:

   ```bash
   npm start
   ```

2. Try registering a new agent:

   - The registration should create a user in Supabase Auth
   - An email with a 6-digit OTP should be sent
   - After verification, the agent should be created in the `agents` table with `status = 'pending'`

3. Check the Supabase dashboard:
   - **Authentication** → **Users**: Should show your new user
   - **Table Editor** → **agents**: Should show your new agent record

## 9. Admin Dashboard Setup (For Later)

When building the admin dashboard, you'll need:

1. **Service Role Key** (not the anon key):

   - Go to **Settings** → **API**
   - Copy the **service_role** key (keep this secret!)
   - Use this in your Next.js admin dashboard with server-side code

2. **Admin Functions**:
   - Query agents: `SELECT * FROM agents WHERE status = 'pending'`
   - Approve agent: `UPDATE agents SET status = 'approved' WHERE id = ?`
   - Reject agent: `UPDATE agents SET status = 'rejected' WHERE id = ?`

## Troubleshooting

### Email not sending?

- Check **Authentication** → **Providers** → **Email** is enabled
- Check your Supabase project's email quota (free tier has limits)
- Verify email templates are configured correctly

### OTP code not working?

- Make sure OTP is enabled in email provider settings
- Check that you're using `verifyOtp` with the correct `type: 'email'`
- Verify the code hasn't expired (default is 1 hour)

### Database errors?

- Make sure you've run the SQL schema setup
- Check Row Level Security policies allow the operations you need
- Verify the `agents` table exists: **Table Editor** → **agents**

### Authentication not persisting?

- Check that AsyncStorage is properly configured (already done in `lib/supabase.ts`)
- Verify session refresh is working
- Check for any console errors related to storage

## Next Steps

- [ ] Set up customer registration table
- [ ] Set up performance metrics tables
- [ ] Configure real-time subscriptions for admin dashboard
- [ ] Set up storage buckets for agent documents (if needed)
- [ ] Configure custom email templates with Airtel branding
