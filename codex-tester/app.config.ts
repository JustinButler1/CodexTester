import { ConfigContext, ExpoConfig } from "expo/config";

const IS_DEV = process.env.APP_VARIANT === 'development';
const IS_PREVIEW = process.env.APP_VARIANT === 'preview';

const getUniqueIdentifier = () => {
  if (IS_DEV) {
    return 'com.justinbutler1.mua.dev';
  }

  if (IS_PREVIEW) {
    return 'com.justinbutler1.mua.preview';
  }

  return 'com.justinbutler1.mua';
};

const getAppName = () => {
  if (IS_DEV) {
    return 'codex-tester (Dev)';
  }

  if (IS_PREVIEW) {
    return 'codex-tester (Preview)';
  }

  return 'codex-tester';
};


export default ({config} : ConfigContext): ExpoConfig => ({
  ...config,
  "name": getAppName(),
  "slug": "codex-tester",
  "version": "1.0.0",
  "orientation": "portrait",
  "icon": "./assets/images/icon.png",
  "scheme": "codextester",
  "userInterfaceStyle": "automatic",
  "newArchEnabled": true,
  "jsEngine": "jsc",
  "ios": {
    "supportsTablet": true,
    "bundleIdentifier": getUniqueIdentifier(),
    "infoPlist": {
      "ITSAppUsesNonExemptEncryption": false
    }
  },
  "android": {
    "adaptiveIcon": {
      "backgroundColor": "#E6F4FE",
      "foregroundImage": "./assets/images/android-icon-foreground.png",
      "backgroundImage": "./assets/images/android-icon-background.png",
      "monochromeImage": "./assets/images/android-icon-monochrome.png"
    },
    "package": "com.justinbutler1.mua",
    "edgeToEdgeEnabled": true,
    "predictiveBackGestureEnabled": false
  },
  "web": {
    "output": "static",
    "favicon": "./assets/images/favicon.png"
  },
  "plugins": [
    "expo-router",
    [
      "expo-splash-screen",
      {
        "image": "./assets/images/splash-icon.png",
        "imageWidth": 200,
        "resizeMode": "contain",
        "backgroundColor": "#ffffff",
        "dark": {
          "backgroundColor": "#000000"
        }
      }
    ]
  ],
  "experiments": {
    "typedRoutes": true,
    "reactCompiler": true
  },
  "extra": {
    "router": {},
    "eas": {
      "projectId": "67e38f3b-e695-4dbd-a0fe-6806ba6c1fc3"
    }
  }
});
