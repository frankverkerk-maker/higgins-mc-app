// Load environment variables with proper priority (system > .env)
import "./scripts/load-env.js";
import type { ExpoConfig } from "expo/config";

// Bundle ID format: space.manus.<project_name_dots>.<timestamp>
// e.g., "my-app" created at 2024-01-15 10:30:45 -> "space.manus.my.app.t20240115103045"
// Bundle ID can only contain letters, numbers, and dots
// Android requires each dot-separated segment to start with a letter
const rawBundleId = "com.app.higginsmcapp";
const bundleId =
  rawBundleId
    .replace(/[-_]/g, ".") // Replace hyphens/underscores with dots
    .replace(/[^a-zA-Z0-9.]/g, "") // Remove invalid chars
    .replace(/\.+/g, ".") // Collapse consecutive dots
    .replace(/^\.+|\.+$/g, "") // Trim leading/trailing dots
    .toLowerCase()
    .split(".")
    .map((segment) => {
      // Android requires each segment to start with a letter
      // Prefix with 'x' if segment starts with a digit
      return /^[a-zA-Z]/.test(segment) ? segment : "x" + segment;
    })
    .join(".") || "space.manus.app";
// Extract timestamp from bundle ID and prefix with "manus" for deep link scheme
// e.g., "space.manus.my.app.t20240115103045" -> "manus20240115103045"
const timestamp = bundleId.split(".").pop()?.replace(/^t/, "") ?? "";
const schemeFromBundleId = `manus${timestamp}`;

// Public legal URLs (served by the production backend). Apple requires a
// reachable Privacy Policy URL for App Store submission.
const PRIVACY_POLICY_URL = "https://higginsmc-fzaggof9.manus.space/privacy";
const TERMS_URL = "https://higginsmc-fzaggof9.manus.space/terms";

const env = {
  // App branding - update these values directly (do not use env vars)
  appName: "Higgins MC",
  appSlug: "higgins-mc-app",
  // S3 URL of the app logo - set this to the URL returned by generate_image when creating custom logo
  // Leave empty to use the default icon from assets/images/icon.png
  logoUrl: "https://d2xsxph8kpxj0f.cloudfront.net/310419663030048912/fzaGgof9hzLwRHCXppwV8j/higgins-app-icon-L6E2Ng9yp86nCgvTZTdwB4.png",
  scheme: schemeFromBundleId,
  iosBundleId: bundleId,
  androidPackage: bundleId,
};

const clientVersion = process.env.EXPO_PUBLIC_CLIENT_VERSION?.trim() || "1.0.3";
const webBaseUrl = process.env.EXPO_PUBLIC_WEB_BASE_URL?.trim() || undefined;

const config: ExpoConfig = {
  name: env.appName,
  slug: env.appSlug,
  version: clientVersion,
  orientation: "portrait",
  icon: "./assets/images/icon.png",
  scheme: env.scheme,
  userInterfaceStyle: "automatic",
  newArchEnabled: true,
  // App Store metadata
  description: "Higgins Mission Control is your personal AI-powered executive command center. Stay ahead with real-time weather, breaking AI & blockchain news, intelligent agent management, and your daily briefing — all in one elegant app.",
  ios: {
    supportsTablet: true,
    bundleIdentifier: env.iosBundleId,
    buildNumber: "1",
    appStoreUrl: undefined,
    privacyManifests: {
      NSPrivacyAccessedAPITypes: [],
    },
    "infoPlist": {
        "ITSAppUsesNonExemptEncryption": false,
        "NSLocationWhenInUseUsageDescription": "Higgins uses your location to show accurate local weather in your morning briefing.",
      }
  },
  android: {
    adaptiveIcon: {
      backgroundColor: "#E6F4FE",
      foregroundImage: "./assets/images/android-icon-foreground.png",
      backgroundImage: "./assets/images/android-icon-background.png",
      monochromeImage: "./assets/images/android-icon-monochrome.png",
    },
    edgeToEdgeEnabled: true,
    predictiveBackGestureEnabled: false,
    package: env.androidPackage,
    permissions: ["POST_NOTIFICATIONS"],
    intentFilters: [
      {
        action: "VIEW",
        autoVerify: true,
        data: [
          {
            scheme: env.scheme,
            host: "*",
          },
        ],
        category: ["BROWSABLE", "DEFAULT"],
      },
    ],
  },
  web: {
    bundler: "metro",
    output: "static",
    favicon: "./assets/images/favicon.png",
  },
  plugins: [
    "expo-router",
    [
      "expo-audio",
      {
        microphonePermission: "Allow $(PRODUCT_NAME) to access your microphone.",
      },
    ],
    [
      "expo-video",
      {
        supportsBackgroundPlayback: true,
        supportsPictureInPicture: true,
      },
    ],
    [
      "expo-splash-screen",
      {
        image: "./assets/images/splash-icon.png",
        imageWidth: 200,
        resizeMode: "contain",
        backgroundColor: "#ffffff",
        dark: {
          backgroundColor: "#000000",
        },
      },
    ],
    [
      "expo-build-properties",
      {
        android: {
          buildArchs: ["armeabi-v7a", "arm64-v8a"],
          minSdkVersion: 24,
        },
      },
    ],
    [
      "expo-notifications",
      {
        icon: "./assets/images/icon.png",
        color: "#00E5C7",
        defaultChannel: "default",
      },
    ],
    // Siri Shortcuts: config plugin disabled until native build (EAS Build)
    // The react-native-siri-shortcut package works at runtime but the config
    // plugin has a broken build path. Re-enable after verifying the plugin build.
  ],
  experiments: {
    typedRoutes: true,
    reactCompiler: true,
    ...(webBaseUrl ? { baseUrl: webBaseUrl } : {}),
  },
  extra: {
    // EAS project ID — populated automatically by `eas init` once an
    // Apple Developer account + EAS project exist. Required for production
    // push notifications. Falls back to env var if provided.
    eas: {
      projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID ?? "",
    },
    privacyPolicyUrl: PRIVACY_POLICY_URL,
    termsUrl: TERMS_URL,
    clientVersion,
  },
};

export default config;
