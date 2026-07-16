# EAS Build + TestFlight Deployment Guide

## Prerequisites

Before you start, you need:

1. **Apple Developer Account** ($99/year) — [developer.apple.com](https://developer.apple.com)
2. **EAS CLI** installed on your Mac: `npm install -g eas-cli`
3. **Expo account** — [expo.dev](https://expo.dev) (free)

---

## Step 1: Login

```bash
# Login to Expo
eas login

# Login to Apple (will prompt for Apple ID + password + 2FA)
eas credentials
```

---

## Step 2: Configure eas.json

Open `eas.json` and replace the placeholders:

```json
"submit": {
  "production": {
    "ios": {
      "appleId": "your@email.com",
      "ascAppId": "1234567890",
      "appleTeamId": "ABC1234DEF"
    }
  }
}
```

**Where to find these values:**
- `appleId` — Your Apple ID email address
- `ascAppId` — App Store Connect → Your App → General → App Information → Apple ID (numeric)
- `appleTeamId` — [developer.apple.com/account](https://developer.apple.com/account) → Membership → Team ID

---

## Step 3: Create App in App Store Connect

1. Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
2. Click "+" → "New App"
3. Fill in:
   - **Platform**: iOS
   - **Name**: Higgins MC
   - **Primary Language**: Dutch (or English)
   - **Bundle ID**: Select the one matching your `app.config.ts` (or register new)
   - **SKU**: `higgins-mc-app`

---

## Step 4: Build for TestFlight

```bash
# Navigate to your project
cd /path/to/higgins-mc-app

# Build for iOS (TestFlight/App Store)
eas build --platform ios --profile production
```

This will:
- Generate provisioning profiles automatically
- Build the app in the Expo cloud (~10-15 minutes)
- Produce an `.ipa` file ready for submission

---

## Step 5: Submit to TestFlight

```bash
# Submit the latest build to App Store Connect
eas submit --platform ios --latest
```

Or submit a specific build:
```bash
eas submit --platform ios --id BUILD_ID
```

---

## Step 6: TestFlight Testing

1. Open **App Store Connect** → **TestFlight** tab
2. Wait for Apple's automated review (~15-30 minutes)
3. Status changes to "Ready to Test"
4. Add internal testers (your Apple ID email)
5. Open **TestFlight app** on your iPhone → Install Higgins MC

---

## Step 7: App Store Submission

When ready for public release:

1. **App Store Connect** → **App Store** tab
2. Fill in:
   - Description (NL + EN)
   - Screenshots (already generated — 10 images)
   - Keywords
   - Support URL
   - Privacy Policy URL
3. Select the TestFlight build
4. Click "Submit for Review"
5. Apple review takes 24-48 hours

---

## Quick Reference Commands

| Action | Command |
|--------|---------|
| Build for TestFlight | `eas build --platform ios --profile production` |
| Build for internal testing | `eas build --platform ios --profile preview` |
| Build for simulator | `eas build --platform ios --profile development` |
| Submit to App Store | `eas submit --platform ios --latest` |
| Check build status | `eas build:list` |
| Update OTA (no rebuild) | `eas update --branch production` |

---

## OTA Updates (After Initial Publish)

Once the app is in the App Store, you can push code updates without a new build:

```bash
# Push an over-the-air update
eas update --branch production --message "Bug fix: chat improvements"
```

This updates JavaScript/assets instantly — no Apple review needed. Only native code changes (new packages, permissions) require a full rebuild.

---

## Troubleshooting

| Issue | Solution |
|-------|----------|
| "No bundle ID registered" | Register at developer.apple.com → Certificates → Identifiers |
| Build fails on signing | Run `eas credentials` and let EAS manage profiles |
| TestFlight "Processing" stuck | Wait up to 1 hour, then rebuild if needed |
| Push notifications not working | Ensure push certificate is configured in EAS credentials |

---

## Push Notification Setup for Production

Push notifications require an APNs key:

1. Go to [developer.apple.com](https://developer.apple.com) → Keys → Create Key
2. Enable "Apple Push Notifications service (APNs)"
3. Download the `.p8` file
4. In Expo dashboard → Project → Credentials → iOS → Push Key → Upload

EAS handles this automatically if you run `eas credentials` and select "Let EAS manage".
