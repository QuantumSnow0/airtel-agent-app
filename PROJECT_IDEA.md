# Airtel Agents - Project Idea

## Overview

Build an agent management system for Airtel Kenya's SmartConnect 5G/FTTx services. This system will allow registered agents to register customers on behalf of Airtel, extending the existing lead capture website functionality to support a distributed agent network.

## Decisions Made

1. ✅ **Agent Registration**: Self-registration with admin approval
2. ✅ **System Architecture**: Separate system that syncs with existing lead capture system
3. ✅ **Existing Tech Stack**: Next.js (for lead capture website)
4. ✅ **Performance Metrics**: Multiple metrics will be tracked (specific metrics to be defined)
5. ✅ **Platform**: Mobile app (agents will use mobile phones - easier and faster for field work)
6. ✅ **Offline Capability**: Fully functional offline mode with sync when connection restored
7. ✅ **Location**: GPS/location tracking (maybe - to be confirmed)
8. ✅ **Admin Dashboard**: Web-based (separate from mobile app)
9. ✅ **Mobile Framework**: React Native with Expo
10. ✅ **Backend Stack**: Supabase

## Final Tech Stack

### Mobile App

- **Framework**: React Native with Expo
- **Language**: TypeScript/JavaScript
- **Offline Storage**: expo-sqlite
- **Location**: expo-location
- **Camera**: expo-camera (if needed)

### Backend

- **Platform**: Supabase
- **Database**: PostgreSQL (via Supabase)
- **Authentication**: Supabase Auth
- **API**: Auto-generated REST API (PostgREST)
- **Storage**: Supabase Storage
- **Real-time**: Supabase Realtime subscriptions

### Admin Dashboard

- **Framework**: Next.js
- **Language**: TypeScript/JavaScript
- **Backend**: Supabase client

### Integration

- **Sync Service**: Supabase Edge Functions or separate service
- **Target**: Existing Next.js lead capture system

## Current State

- **Existing System**: Frontend lead capture website for Airtel Kenya's SmartConnect 5G/FTTx services
- **Technology**: Next.js
- **Current Functionality**: Collects customer information for installation requests
- **Limitation**: Only direct customer submissions are supported

## Problem Statement

Airtel needs a scalable way to enable field agents to register customers for SmartConnect 5G/FTTx installation requests. This will help:

- Expand reach through agent networks
- Enable on-the-ground customer registration
- Track agent performance and customer registrations
- Maintain data quality and consistency

## Solution Approach

Create a mobile application for agents that allows:

1. Agent registration and authentication
2. Agent dashboard to view their registrations
3. Customer registration form (similar to existing lead capture)
4. Offline capability for areas with poor connectivity
5. Agent management system (for admin oversight - web dashboard)
6. Integration with existing lead capture system

## Key Features

### Agent Features

- Agent registration/login system
- Customer registration form (5G/FTTx service requests)
- View submitted registrations
- Track registration status
- Agent profile management

### Admin/Management Features

- Agent approval/management
- View all agent registrations
- Agent performance metrics
- Customer registration management
- Export/reporting capabilities

### System Features

- Integration with existing lead capture system
- Data validation and consistency
- Agent authentication & authorization
- Audit trail for agent actions

## Technology Stack

**Existing System**: Next.js (lead capture website)

**New System** (To be discussed):

### Mobile App Options:

#### React Native with Expo (Recommended for this project)

**Pros:**

- ✅ Faster development and easier setup
- ✅ Built-in tools for building, testing, and deploying
- ✅ Over-the-air (OTA) updates without app store approval
- ✅ Good for MVP and rapid iteration
- ✅ Expo Go app for quick testing during development
- ✅ Built-in support for many common features (camera, location, etc.)
- ✅ Easier for teams new to mobile development

**Cons:**

- ⚠️ Some native modules require "ejecting" or using Expo dev client
- ⚠️ Slightly larger app size
- ⚠️ Less control over native code (but usually not needed)

**Expo SDK includes:**

- Location/GPS (expo-location)
- Camera (expo-camera)
- Offline storage (AsyncStorage, SQLite via expo-sqlite)
- Push notifications
- File system access
- And many more...

#### React Native (Bare/CLI)

**Pros:**

- ✅ Full control over native code
- ✅ Smaller app size
- ✅ Can use any native module directly

**Cons:**

- ⚠️ More complex setup
- ⚠️ Need to configure iOS/Android projects manually
- ⚠️ More time-consuming for initial setup

#### Other Options:

- **Flutter** - Cross-platform (iOS + Android), Dart, fast performance, good UI
- **Native** - Separate iOS (Swift) and Android (Kotlin) apps (more development time)
- **Progressive Web App (PWA)** - Web-based, works on mobile, easier deployment

### Backend Options:

#### Supabase (Recommended - Fastest Build) ⭐

**What is Supabase?**

- Open-source Firebase alternative
- Built on PostgreSQL database
- Provides backend-as-a-service (BaaS)

**Pros:**

- ✅ **Very fast development** - Get started in minutes
- ✅ **PostgreSQL database** - Robust, relational, SQL queries
- ✅ **Built-in authentication** - Email, phone, OAuth, magic links
- ✅ **Auto-generated REST API** - No backend code needed initially
- ✅ **Real-time subscriptions** - Live updates for admin dashboard
- ✅ **Row Level Security (RLS)** - Database-level permissions
- ✅ **Storage** - File uploads (for agent documents, customer photos)
- ✅ **Edge Functions** - Serverless functions when needed
- ✅ **Free tier** - Good for MVP and testing
- ✅ **Great React Native/Expo support** - Official SDK
- ✅ **Admin dashboard** - Built-in database UI
- ✅ **TypeScript support** - Auto-generated types

**Cons:**

- ⚠️ Vendor lock-in (but can self-host)
- ⚠️ Less control over infrastructure
- ⚠️ Pricing can scale with usage

**Perfect for:**

- MVP and rapid development ✅
- Teams wanting to focus on frontend ✅
- Projects needing auth + database + storage ✅
- Real-time features ✅

**Supabase Stack:**

- Database: PostgreSQL (managed)
- Authentication: Built-in (JWT-based)
- API: Auto-generated REST + GraphQL (via PostgREST)
- Storage: S3-compatible object storage
- Real-time: WebSocket subscriptions

---

#### Custom Backend (Node.js/Python/Java)

**Node.js + Express/Fastify:**

- ✅ Full control
- ✅ JavaScript/TypeScript (same as frontend)
- ✅ Large ecosystem
- ⚠️ More setup time
- ⚠️ Need to build auth, API, etc.

**Python + FastAPI/Django:**

- ✅ Fast development with Django
- ✅ Great for data processing
- ⚠️ Different language from frontend
- ⚠️ More setup time

**Java + Spring Boot:**

- ✅ Enterprise-grade
- ✅ Very scalable
- ⚠️ More verbose, slower development

---

#### Other BaaS Options:

**Firebase:**

- Similar to Supabase
- NoSQL (Firestore) vs SQL (Supabase)
- More mature, but less flexible

**AWS Amplify:**

- Full AWS integration
- More complex setup
- More expensive

---

### Recommendation: Supabase

**Why Supabase fits this project:**

1. ✅ **Fast MVP** - Get authentication, database, and API working quickly
2. ✅ **Agent approval workflow** - RLS policies can handle admin approval
3. ✅ **Real-time dashboard** - Admin can see registrations live
4. ✅ **Offline sync** - Can build sync layer on top of Supabase
5. ✅ **Storage** - For agent documents, customer photos if needed
6. ✅ **Expo integration** - Official Supabase JS client works great with React Native

**Architecture with Supabase:**

- Mobile App (Expo) → Supabase Client → Supabase Backend
- Admin Dashboard (Next.js) → Supabase Client → Supabase Backend
- Sync Service → Supabase → Existing Lead Capture System

### Integration:

- Separate system that syncs with existing lead capture system
- Sync mechanism: [Real-time API calls or batch processing?]

## Architecture/Design

### Components

1. **Mobile App** - React Native with Expo for agents (iOS + Android)
   - Offline-first architecture with local storage (expo-sqlite)
   - GPS/location tracking capability (expo-location)
   - Sync mechanism for when connection is restored
   - Supabase client for backend communication
2. **Admin Dashboard** - Web-based management interface (Next.js)
   - Real-time updates via Supabase subscriptions
   - Agent management and approval
   - Performance metrics and reporting
3. **Backend** - Supabase (PostgreSQL + Auth + API + Storage)
   - Auto-generated REST API
   - Built-in authentication
   - Row Level Security for permissions
   - Real-time subscriptions
4. **Database** - PostgreSQL (via Supabase)
   - Stores agents, customers, registrations
   - Relationships and constraints
5. **Integration Layer** - Sync service/function
   - Connects Supabase with existing lead capture system
   - Can be Supabase Edge Function or separate service
6. **Offline Storage** - Local database/cache for mobile app (expo-sqlite)
   - Queue registrations when offline
   - Sync when online

### Data Flow

- Agent registers customer → Data validated → Stored in database → Synced with existing system

## User Flow

### Agent Flow

1. Agent registers/logs in
2. Agent navigates to customer registration
3. Agent fills customer information form
4. Agent submits registration
5. Agent views confirmation and registration history

### Admin Flow

1. Admin reviews agent applications
2. Admin approves/manages agents
3. Admin views all registrations
4. Admin tracks agent performance

## Questions & Considerations

### 📋 Remaining Questions to Answer

**Agent Management:**

1. ✅ **Verification/Approval Process**:
   - Agents must verify their email address
   - Every agent must be approved by admin before they can use the system
   - Two-step process: Email verification → Admin approval
2. ✅ **Permission Levels**: All agents have the same permissions. Admin handles all approvals.
3. ✅ **Duplicate Prevention**: Use email address to prevent duplicate agent registrations. Email must be unique in the system.
4. ✅ **Required Agent Information**:
   - Name
   - Email address
   - Airtel phone number
   - Safaricom phone number
   - Location (Town and Area)

**Customer Registration:**

5. ✅ **Edit/Update Registrations**: For now, agents cannot edit/update registrations after submission. This feature may be added later.
6. ✅ **Duplicate Customer Registrations**:
   - Allow duplicate registrations but warn the agent
   - Notify admin about duplicate registrations
   - Agent does not get commission for duplicate registrations
   - Specific field(s) to check for duplicates will be determined when designing the customer form
7. ⏳ **Customer Verification/Validation**: To be determined when designing the customer form
8. ✅ **Status Updates for Agents**:
   - Agents can see limited status updates on their registrations
   - Agents should NOT retain full customer details (privacy/security)
   - Status options: Approved, Installed
   - Agent gets commission when status is "Installed"
   - Agents should receive notifications when status changes

**Integration:**

9. ✅ **Sync Mechanism**: Real-time sync - sync immediately when registrations are submitted
10. ✅ **Data Format/Structure**:
    - Customer registration data should match existing lead capture format
    - Need to track which agent registered the customer (agent_id, registration_source fields)
    - Have access to existing lead capture data structure/schema
11. ✅ **Sync Failure Handling**:
    - Automatically retry failed syncs (3 retry attempts)
    - Queue failed syncs for later retry
    - Notify both agent and admin when sync fails
    - Log all sync failures for debugging
12. ✅ **Existing System Downtime Handling**:
    - Agents can continue registering customers even if existing lead capture system is down
    - Store registrations in local app storage (for offline capability)
    - Also store in Supabase (our backend system)
    - Queue registrations for sync to existing system when it comes back online
    - Notify both agents and admin when existing system is down
    - Note: This refers to the existing Next.js lead capture system being down, not Supabase

**Technical:**

13. ✅ **Mobile App ↔ Backend Sync**: Real-time updates - mobile app should get real-time updates from Supabase, including real-time status updates
14. ✅ **Analytics/Reporting Requirements**:
    - All agents' customer data
    - Each agent's customer numbers/counts
    - All customer details per agent
    - Any other important metrics/KPIs
    - Access: Admin only
    - Export format: Excel
    - Include any relevant KPIs/metrics for agent performance tracking
15. ✅ **Performance Requirements**:
    - Expected agents: Less than 100 to start
    - Expected registrations per day: 5-30 at start
    - Peak scenario: All agents active at once
    - System should handle concurrent usage by all agents
16. ✅ **App Distribution**:
    - Google Play Store (Android)
    - Start with APK testing/internal testing first
    - Then publish to Google Play Store
    - iOS distribution: [To be determined]
17. ✅ **Camera Access**: Not needed, not even for later use
18. ✅ **Push Notifications**:
    - Agents should receive push notifications for all necessary events
    - Events include: Registration status changes (Approved, Installed), sync failures, etc.
    - Admins should also receive push notifications
    - Admin notifications: New agent registrations, sync failures, system alerts, etc.
19. ✅ **GPS/Location Tracking**: Not needed

**Business:**

20. ✅ **Commission/Tracking for Agents**:
    - Agents get commission for registrations
    - Commission calculated per installation (percentage to be discussed later)
    - System should track commission automatically
    - Need commission reports/payments functionality
21. ✅ **Geographic Assignment**: Agents can work anywhere - no geographic assignment needed
22. ✅ **Service Area Restrictions**: No restrictions - agents can register customers anywhere
23. ✅ **Most Important Metrics**:
    - Conversions are the base of operations
    - Conversion rate (registrations → installations) is the primary metric
    - All other metrics should be tracked based on conversions
    - Focus on conversion-based KPIs

---

### Agent Management

- ✅ **Agent Registration**: Self-registration with admin approval
- ✅ **Verification/Approval Process**:
  - Agents must verify their email address
  - Every agent must be approved by admin before access
  - Two-step process: Email verification → Admin approval
- ✅ **Permission Levels**: All agents have the same permissions. Admin handles all approvals.
- ✅ **Duplicate Prevention**: Use email address to prevent duplicate agent registrations. Email must be unique in the system.
- ✅ **Required Agent Information**:
  - Name
  - Email address
  - Airtel phone number
  - Safaricom phone number
  - Location (Town and Area)

### Customer Registration

- ✅ **Edit/Update Registrations**: For now, agents cannot edit/update registrations after submission. This feature may be added later.
- ✅ **Duplicate Customer Registrations**:
  - Allow duplicate registrations but warn the agent
  - Notify admin about duplicate registrations
  - Agent does not get commission for duplicate registrations
  - Specific field(s) to check for duplicates will be determined when designing the customer form
- ⏳ **Customer Verification/Validation**: To be determined when designing the customer form
- ✅ **Status Updates for Agents**:
  - Agents can see limited status updates on their registrations
  - Agents should NOT retain full customer details (privacy/security)
  - Status options: Approved, Installed
  - Agent gets commission when status is "Installed"
  - Agents should receive notifications when status changes

### Integration

- ✅ **Integration Approach**: Separate system that syncs with existing lead capture system
- ✅ **Source Tracking**: Agent registrations will be distinguishable from direct customer registrations
- ✅ **Sync Mechanism**: Real-time sync - sync immediately when registrations are submitted
- ✅ **Data Format/Structure**:
  - Customer registration data should match existing lead capture format
  - Need to track which agent registered the customer (agent_id, registration_source fields)
  - Have access to existing lead capture data structure/schema
- ✅ **Sync Failure Handling**:
  - Automatically retry failed syncs (3 retry attempts)
  - Queue failed syncs for later retry
  - Notify both agent and admin when sync fails
  - Log all sync failures for debugging
- ✅ **Existing System Downtime Handling**:
  - Agents can continue registering customers even if existing lead capture system is down
  - Store registrations in local app storage (for offline capability)
  - Also store in Supabase (our backend system)
  - Queue registrations for sync to existing system when it comes back online
  - Notify both agents and admin when existing system is down
  - Note: This refers to the existing Next.js lead capture system being down, not Supabase

### Technical

- ✅ **Platform**: Mobile app (iOS + Android)
- ✅ **Offline Capability**: Fully functional offline mode
  - Local data storage when offline (SQLite/AsyncStorage)
  - Queue registrations locally when offline
  - Automatic sync when connection is restored
  - Conflict resolution strategy needed
- ✅ **Location/GPS**: Not needed
- ✅ **Admin Dashboard**: Web-based (separate from mobile app)
- ✅ **Mobile App ↔ Backend Sync**: Real-time updates - mobile app should get real-time updates from Supabase, including real-time status updates
- ✅ **Analytics/Reporting**:
  - All agents' customer data
  - Each agent's customer numbers/counts
  - All customer details per agent
  - Any other important metrics/KPIs
  - Access: Admin only
  - Export format: Excel
  - Include any relevant KPIs/metrics for agent performance tracking
- ✅ **Performance Requirements**:
  - Expected agents: Less than 100 to start
  - Expected registrations per day: 5-30 at start
  - Peak scenario: All agents active at once
  - System should handle concurrent usage by all agents
- ✅ **App Distribution**:
  - Google Play Store (Android)
  - Start with APK testing/internal testing first
  - Then publish to Google Play Store
  - iOS distribution: [To be determined]
- ✅ **Camera Access**: Not needed, not even for later use
- ✅ **Push Notifications**:
  - Agents should receive push notifications for all necessary events
  - Events include: Registration status changes (Approved, Installed), sync failures, etc.
  - Admins should also receive push notifications
  - Admin notifications: New agent registrations, sync failures, system alerts, etc.

### Business

- ✅ **Agent Performance Metrics**: Multiple metrics will be tracked (to be defined)
  - Examples to consider: Number of registrations, conversion rate, registration quality, geographic coverage, time to registration, etc.
- ✅ **Commission/Tracking for Agents**:
  - Agents get commission for registrations
  - Commission calculated per installation (percentage to be discussed later)
  - System should track commission automatically
  - Need commission reports/payments functionality
- ✅ **Geographic Assignment**: Agents can work anywhere - no geographic assignment needed
- ✅ **Service Area Restrictions**: No restrictions - agents can register customers anywhere
- ✅ **Most Important Metrics**:
  - Conversions are the base of operations
  - Conversion rate (registrations → installations) is the primary metric
  - All other metrics should be tracked based on conversions
  - Focus on conversion-based KPIs

## Limitations & Workarounds

### Expo Limitations

**Potential Limitations:**

1. **Native Module Access**

   - Some very specific native modules might not be available
   - **Workaround**: Use Expo Dev Client or eject to bare React Native (rarely needed)
   - **For this project**: All needed features (GPS, camera, offline storage) are available ✅

2. **App Size**

   - Expo apps are slightly larger (~5-10MB)
   - **Workaround**: Use EAS Build with optimization
   - **For this project**: Not a concern for agent apps ✅

3. **Custom Native Code**

   - Can't directly modify native iOS/Android code in managed workflow
   - **Workaround**: Use config plugins or eject if absolutely necessary
   - **For this project**: Unlikely to need custom native code ✅

4. **Build Process**
   - Need EAS Build service or configure local builds
   - **Workaround**: EAS Build is straightforward and free tier available
   - **For this project**: Standard builds, no issue ✅

**Verdict for This Project**: ✅ **No significant limitations** - Expo covers all requirements

---

### Supabase Limitations

**Potential Limitations:**

1. **Complex Business Logic**

   - Limited server-side logic without Edge Functions
   - **Workaround**: Use Supabase Edge Functions (Deno) or separate microservice
   - **For this project**: Most logic can be in client/Edge Functions ✅

2. **Database Customization**

   - Managed PostgreSQL, less control over server config
   - **Workaround**: Use extensions available in Supabase, or self-host if needed
   - **For this project**: Standard PostgreSQL features are sufficient ✅

3. **Vendor Lock-in**

   - Data and code tied to Supabase
   - **Workaround**:
     - Supabase is open-source (can self-host)
     - PostgreSQL is standard (can export/migrate)
     - API is standard REST (can switch to custom backend)
   - **For this project**: Migration path exists if needed ✅

4. **Pricing at Scale**

   - Costs increase with usage (API calls, storage, bandwidth)
   - **Workaround**:
     - Free tier is generous for MVP
     - Can optimize queries, use caching
     - Can self-host for cost control
   - **For this project**: Free tier should cover initial needs ✅

5. **Rate Limiting**

   - API rate limits on free/pro tiers
   - **Workaround**:
     - Implement client-side caching
     - Batch operations
     - Upgrade plan if needed
   - **For this project**: Offline-first design helps here ✅

6. **Complex Queries**

   - Some very complex SQL might be harder via REST API
   - **Workaround**:
     - Use PostgREST filters (covers 95% of cases)
     - Use database functions/views
     - Use Edge Functions for complex logic
   - **For this project**: Standard CRUD + some aggregations, should be fine ✅

7. **Real-time Limitations**
   - Real-time subscriptions have connection limits
   - **Workaround**:
     - Use polling for less critical updates
     - Optimize subscription usage
   - **For this project**: Admin dashboard real-time is nice-to-have, not critical ✅

**Verdict for This Project**: ✅ **No significant limitations** - Supabase handles all requirements

---

### Combined Stack Limitations

**Potential Issues:**

1. **Offline Sync Complexity**

   - Supabase doesn't have built-in offline sync
   - **Workaround**:
     - Use expo-sqlite for local storage
     - Build sync layer (queue + conflict resolution)
     - This is standard for offline apps anyway
   - **For this project**: We need to build this regardless of backend ✅

2. **Integration with Existing System**
   - Need to sync Supabase → Existing Next.js system
   - **Workaround**:
     - Build sync service (Supabase Edge Function or separate service)
     - Use webhooks or scheduled jobs
     - Standard integration pattern
   - **For this project**: Expected requirement, not a limitation ✅

**Overall Assessment**:

- ✅ **Expo + Supabase will NOT limit this project**
- ✅ All core requirements are achievable
- ✅ Both have clear migration paths if needed later
- ✅ Faster development outweighs any minor limitations

---

## Next Steps

1. **Clarify Requirements**

   - Answer questions above
   - Define user stories
   - Map out detailed workflows

2. **Technical Planning**

   - ✅ Technology stack chosen: Expo + Supabase
   - Design database schema
   - Plan API structure
   - Define integration points
   - Design offline sync strategy

3. **Prototype**
   - Build MVP with core features
   - Test with sample agents
   - Iterate based on feedback
