# How to Update Supabase Email Templates

## Step-by-Step Guide

### 1. Access Email Templates in Supabase

1. Go to your **Supabase Dashboard**
2. Select your project
3. Navigate to **Authentication** → **Email Templates**
4. You'll see templates for:
   - Confirm signup
   - Invite user
   - Magic link
   - Change email address
   - Reset password

### 2. Update Password Reset Template

1. Click on **"Reset Password"** template
2. You'll see two sections:
   - **Subject** (email subject line)
   - **Body** (email content - can be HTML or plain text)

3. **Update Subject:**
   ```
   Reset Your Airtel Agents Password
   ```

4. **Update Body (HTML):**
   Copy the HTML template from `EMAIL_DELIVERABILITY_FIX.md` section "Password Reset Email Template"

5. **Save the template**

### 3. Update Email Verification Template

1. Click on **"Confirm Signup"** template
2. Update Subject and Body (HTML) using the template from `EMAIL_DELIVERABILITY_FIX.md`

### 4. Test the Template

1. Go to **Authentication** → **Users**
2. Click on a test user
3. Click **"Send reset password email"** or **"Send verification email"**
4. Check your email to see the new template

## Important Notes

### Template Variables

Supabase provides these variables in email templates:

- `{{ .ConfirmationURL }}` - The verification/reset link URL
- `{{ .Email }}` - User's email address
- `{{ .Token }}` - The verification token (if needed)
- `{{ .TokenHash }}` - Hashed token (if needed)

### Deep Link Format

Make sure your reset link redirects to your app:
- In `forgot-password.tsx`, we set: `redirectTo: "airtelagentsapp://reset-password"`
- This should be included in the template link automatically via `{{ .ConfirmationURL }}`

### HTML vs Plain Text

- **HTML**: More professional, better formatting, images, buttons
- **Plain Text**: Fallback if HTML doesn't load, better for accessibility
- **Best Practice**: Provide both HTML and plain text versions

### Template Best Practices

1. ✅ **Use professional branding** (logo, colors, company name)
2. ✅ **Clear call-to-action** (prominent button/link)
3. ✅ **Security messaging** (expiry time, ignore if not requested)
4. ✅ **Mobile responsive** (emails read on phones)
5. ✅ **Clear instructions** (what to do, when link expires)
6. ✅ **Footer with company info** (builds trust)
7. ❌ **Avoid spam triggers** (no excessive exclamation marks, "FREE", etc.)
8. ❌ **Don't use URL shorteners** (looks suspicious)
9. ❌ **Don't attach files** (transactional emails shouldn't have attachments)

## Troubleshooting

### Template not updating?

- Clear browser cache
- Wait a few minutes for changes to propagate
- Check if you saved the template (click "Save" button)

### Links not working?

- Verify `{{ .ConfirmationURL }}` is in the template
- Check deep link scheme in app.json matches the redirectTo URL
- Test on actual device (not just email preview)

### HTML not rendering?

- Check if email client supports HTML (most do)
- Provide plain text fallback
- Test in multiple email clients (Gmail, Outlook, Apple Mail)

## Quick Template Checklist

- [ ] Subject line is clear and professional
- [ ] HTML template uses proper structure
- [ ] Company branding included
- [ ] Call-to-action button is prominent
- [ ] Alternative text link provided
- [ ] Security notice included
- [ ] Expiry time mentioned
- [ ] Footer with company info
- [ ] Mobile responsive design
- [ ] Tested in multiple email clients


