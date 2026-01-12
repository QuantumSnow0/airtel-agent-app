# Agent Registration Frontend Design

## Overview

Design document for the agent self-registration flow in the mobile app (React Native + Expo).

## Registration Flow

### Step 1: Welcome/Introduction Screen

- Welcome message
- Brief explanation of what agents do
- "Get Started" or "Register" button

### Step 2: Registration Form (Multi-Step Wizard)

#### Step 2.1: Personal Information

1. **Name** (Text Input)

   - Full name
   - Required validation
   - Placeholder: "Enter your full name"

2. **Email Address** (Email Input)

   - Email format validation
   - Required validation
   - Unique check (prevent duplicates)
   - Placeholder: "Enter your email address"
   - Error message if email already exists

3. **Password** (Password Input)
   - Password creation
   - Required validation
   - Password strength requirements (to be defined)
   - Placeholder: "Create a password"
   - Show/hide password toggle

#### Step 2.2: Contact Information

4. **Airtel Phone Number** (Phone Input - Plain)

   - Phone number format validation
   - Required validation
   - Placeholder: "Enter your Airtel number"
   - Format: Kenyan phone number format

5. **Safaricom Phone Number** (Phone Input - Plain)
   - Phone number format validation
   - Required validation
   - Placeholder: "Enter your Safaricom number"
   - Format: Kenyan phone number format

#### Step 2.3: Location Information

6. **Location - Town** (Dropdown)

   - Town selection from dropdown
   - Required validation
   - Placeholder: "Select town"
   - List of Kenyan towns

7. **Location - Area** (Text Input)
   - Area within town
   - Required validation
   - Placeholder: "Enter area"

### Step 3: Email Verification

- After form submission, send verification email
- Show "Check your email" screen
- Display email address where verification was sent
- "Resend verification email" button
- "I've verified my email" button (after user clicks link in email)
- Or auto-detect verification via deep link
- User can proceed after email verification

### Step 4: Pending Approval Screen

- After email verification, show "Pending Approval" screen
- Message: "Your registration is pending admin approval"
- "You will be notified once your account is approved"
- Logout option
- Status indicator

## UI/UX Considerations

### Form Design

- Clean, simple form layout
- One field per screen or scrollable form (to be decided)
- Clear labels and placeholders
- Input validation with helpful error messages
- "Next" and "Back" navigation
- Progress indicator (Step X of Y)

### Validation

- Real-time validation as user types
- Clear error messages below each field
- Disable submit button until all fields are valid
- Email uniqueness check on blur

### Error Handling

- Network error handling
- Email already exists error
- Validation errors
- Retry mechanisms

### Success States

- Email sent confirmation
- Email verified confirmation
- Registration submitted confirmation

## Technical Implementation Notes

### Form State Management

- Use React Hook Form or Formik for form management
- Validation with Yup or Zod
- Async validation for email uniqueness

### API Integration

- POST to Supabase: `/auth/signup` or custom endpoint
- Check email uniqueness before submission
- Handle Supabase auth email verification

### Navigation Flow

```
Welcome Screen
  → Registration Form
    → Email Verification Screen
      → Pending Approval Screen
```

### Deep Linking

- Handle email verification link
- Deep link format: `airtelagents://verify?token=xxx`
- Auto-verify when app opens from email link

## Screens to Design

1. **Welcome Screen**
2. **Registration Form Screen(s)**
3. **Email Verification Screen**
4. **Pending Approval Screen**
5. **Error States** (Network errors, validation errors)

## Decisions Made

- ✅ **Form Layout**: Multi-step wizard
- ✅ **Town Selection**: Dropdown
- ✅ **Phone Number Format**: Plain input (no masking)
- ✅ **Authentication**: Password (not magic link)
- ✅ **Design Style**: Work on design as we build

## Progress Tracking

- ✅ **Project Setup**: Expo Router project created with tabs template
- ✅ **TypeScript Config**: Fixed tsconfig.json extends path
- ✅ **App Branding**: Configured Airtel brand colors in app.json
- ✅ **Form Layout Decision**: Multi-step wizard
- ✅ **Town Selection**: Dropdown
- ✅ **Phone Format**: Plain input
- ✅ **Authentication**: Password
- ✅ **App Icons/Images**: Airtel-branded images replaced
- ✅ **Dependencies**: Installed Supabase, react-hook-form, zod, expo-sqlite
- ✅ **Welcome Screen**: Created with welcome image, beautiful fonts (Poppins & Inter), and bottom-aligned button
- ⏳ **Registration Form**: Create multi-step form
- ⏳ **Email Verification**: Implement verification flow
- ⏳ **Pending Approval**: Create pending screen

## App Branding & Assets

### Brand Colors

- **Primary Color**: #0066CC (Airtel Blue - matches app icon gradient)
- **Splash Screen Background**: #FFFFFF (White)
- **Android Adaptive Icon Background**: #FFFFFF (White)

### Required Images

The following images need to be created/replaced with Airtel branding:

1. **App Icon** (`icon.png`)

   - Size: 1024x1024px
   - Format: PNG
   - Content: Airtel logo or app icon

2. **Android Adaptive Icon - Foreground** (`android-icon-foreground.png`)

   - Size: 1024x1024px
   - Format: PNG
   - Content: Airtel logo/icon (foreground layer)

3. **Android Adaptive Icon - Background** (`android-icon-background.png`)

   - Size: 1024x1024px
   - Format: PNG
   - Content: Background pattern or solid color

4. **Android Adaptive Icon - Monochrome** (`android-icon-monochrome.png`)

   - Size: 1024x1024px
   - Format: PNG
   - Content: Monochrome version for themed icons

5. **Splash Screen Icon** (`splash-icon.png`)

   - Size: 200x200px (or larger, will be resized)
   - Format: PNG
   - Content: Airtel logo for splash screen

6. **Favicon** (`favicon.png`)
   - Size: 48x48px (or 16x16px, 32x32px)
   - Format: PNG
   - Content: Airtel logo for web

**Note**: Currently using placeholder React logos. These need to be replaced with Airtel-branded assets.

## Next Steps

1. ✅ Create Expo Router project
2. ✅ Fix TypeScript configuration
3. ✅ Configure app branding colors
4. ⏳ Replace placeholder images with Airtel branding
5. Install dependencies (Supabase, react-hook-form, zod)
6. Create welcome screen
7. Create multi-step registration form
8. Implement form validation logic
9. Integrate with Supabase auth
10. Create email verification flow
11. Create pending approval screen
