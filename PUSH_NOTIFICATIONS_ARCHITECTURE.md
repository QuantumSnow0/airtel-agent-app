# Push Notifications Architecture

## Overview

Push notifications allow agents to receive notifications even when the app is closed or in the background. This is critical for important updates like registration approvals, earnings, and account status changes.

## Architecture Flow

```
1. App Opens → Request Permission → Get Device Token
2. Device Token → Save to Database (device_tokens table)
3. Notification Created (Database Trigger) → Edge Function Triggered
4. Edge Function → Fetch Device Token → Send Push via Expo Push API
5. Device Receives Push → App Handles (Foreground/Background/Closed)
6. User Taps Notification → Navigate to Relevant Screen
```

## Components

### 1. Client-Side (React Native)
- **expo-notifications**: Request permissions, get device token, handle notifications
- **Device Token Service**: Register/update token in database
- **Notification Handlers**: Handle foreground, background, and notification taps

### 2. Database
- **device_tokens table**: Stores device tokens per agent
- **Database Trigger**: Fires when notification is created
- **Edge Function Trigger**: Calls push notification Edge Function

### 3. Backend (Supabase Edge Functions)
- **send-push-notification**: Receives notification data, fetches device token, sends push via Expo Push API

## Implementation Steps

1. ✅ Install expo-notifications
2. ✅ Create device_tokens table
3. ✅ Create device token registration service
4. ✅ Set up notification handlers (foreground/background)
5. ✅ Create Edge Function to send push notifications
6. ✅ Create database trigger to call Edge Function
7. ✅ Handle notification taps for navigation

## Notification States

### Foreground (App Open)
- Show in-app notification banner
- Play sound/vibration
- Update UI immediately

### Background (App Minimized)
- Show system notification
- Play sound/vibration
- Update badge count

### Closed (App Not Running)
- Show system notification
- Play sound/vibration
- When tapped, open app and navigate

