Title: Fix duplicate-class com.serenegiant.widget.IAspectRatioView (machine-readable)

Purpose:
This file is a concise, exact, and machine-actionable summary describing how to remove a duplicate Java interface `com.serenegiant.widget.IAspectRatioView` that appears both in the source of `react-native-uvc-camera->usbCameraCommon` and in the external artifact `com.serenegiant:common`. The steps below are intended to be executed by another automation/AI to reproduce and persist the fix.

Assumptions:
- Workspace root: project contains `package.json` and `android/` folder.
- Node and npm are available.
- The target package in node_modules is `react-native-uvc-camera` version 2.0.2.
- Java/Gradle/Android SDK/NDK are available for verification builds.

High-level steps (actionable):
1) Ensure `patch-package` is installed as a devDependency and scripts exist:
   - Add devDependency: "patch-package": "^6.5.1" (or latest)
   - Add scripts: "postinstall": "patch-package" and "prepare": "patch-package" in `package.json`.

2) Edit package in node_modules (create patch):
   - Delete file:
     node_modules/react-native-uvc-camera/usbCameraCommon/src/main/java/com/serenegiant/widget/IAspectRatioView.java
   - Edit file:
     node_modules/react-native-uvc-camera/usbCameraCommon/build.gradle
     Change dependency line from:
       implementation "com.serenegiant:common:${commonLibVersion}"
     to:
       api "com.serenegiant:common:${commonLibVersion}"

3) Generate patch file:
   - Run: npx patch-package react-native-uvc-camera
   - Result: patches/react-native-uvc-camera+2.0.2.patch (contains deletion and build.gradle edit)

4) Commit to repo:
   - Add `patches/*` and the `package.json` changes.

5) Optional safety packaging exclusion (app-level):
   - Edit `android/app/build.gradle` and add inside `android {}` block:
     packagingOptions {
       exclude 'com/serenegiant/widget/IAspectRatioView.class'
     }

6) Verification (clean install & build):
   - Remove node_modules: delete `node_modules`
   - Run: npm ci
   - Confirm file removed:
     if (Test-Path node_modules\react-native-uvc-camera\usbCameraCommon\src\main\java\com\serenegiant\widget\IAspectRatioView.java) { FAIL }
   - Build release:
     cd android
     .\gradlew.bat clean assembleRelease --no-daemon
   - Check for success: file created `android\app\build\outputs\apk\release\app-release.apk` and no R8/Dex duplicate errors in logs.

7) If duplicate remains, search for other copies:
   - Search patterns: "IAspectRatioView" across project, node_modules, and gradle caches (user's .gradle/caches).
   - If found in an AAR/JAR: consider excluding that artifact or adjusting dependency resolution so only one provider remains.

8) Upstream: open PR or issue on the original `react-native-uvc-camera` repo describing the duplicate to request removal or change.

Exact files to modify/create (compact):
- package.json (add devDependency + scripts)
- node_modules/react-native-uvc-camera/usbCameraCommon/build.gradle (implementation -> api)
- Delete node_modules/react-native-uvc-camera/usbCameraCommon/src/.../IAspectRatioView.java
- patches/react-native-uvc-camera+2.0.2.patch (created by patch-package)
- Optional: android/app/build.gradle (packagingOptions exclude)

Commands (PowerShell friendly):
# Install patch-package
npm install --save-dev patch-package

# After modifying node_modules
npx patch-package react-native-uvc-camera

# Verify (clean run)
Remove-Item -Recurse -Force node_modules
npm ci
if (Test-Path "node_modules\react-native-uvc-camera\usbCameraCommon\src\main\java\com\serenegiant\widget\IAspectRatioView.java") { Write-Host "FAIL: duplicate still exists"; exit 1 } else { Write-Host "Patch applied" }
cd android
.\gradlew.bat clean assembleRelease --no-daemon

Notes for automation:
- Ensure the package name used with `patch-package` exactly matches the package's name in `node_modules/<pkg>/package.json`.
- Use file deletion rather than emptying the file if possible, so patch-package records a clear Delete File operation.
- For Non-Windows runners adjust path separators accordingly.

Contact: If verification fails, capture and provide the Gradle error output (R8/dex merge error text) to further triage.

---
Generated: 2025-09-26
