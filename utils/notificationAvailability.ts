import { requireOptionalNativeModule } from 'expo-modules-core';

/**
 * Expo Go on Android has not shipped the push-notification native modules
 * since SDK 53 (confirmed: https://github.com/expo/expo/issues — "Cannot find
 * native module 'ExpoTopicSubscriptionModule'" / 'ExpoNotificationsHandlerModule').
 *
 * expo-notifications' own internal module files
 * (node_modules/expo-notifications/src/NotificationsHandlerModule.native.ts,
 * TopicSubscriptionModule.android.ts, etc.) call expo-modules-core's
 * `requireNativeModule(name)` directly, which THROWS synchronously if the
 * native module isn't registered. Because this happens at module-evaluation
 * time (not inside a function we control), Metro's module loader
 * (guardedLoadModule -> ErrorUtils.reportFatalError) treats it as a fatal
 * error that crashes the whole app, bypassing any try/catch around the
 * `import * as Notifications from 'expo-notifications'` statement itself.
 *
 * The fix: check for the native module's presence ourselves, BEFORE ever
 * calling into `expo-notifications`, using the non-throwing
 * `requireOptionalNativeModule` (returns the real module object on iOS Expo
 * Go and in any production/EAS build where the native code is compiled in,
 * and `null` only when the native module genuinely isn't registered — i.e.
 * Android Expo Go for this specific module set).
 *
 * We check two of the modules expo-notifications touches the earliest:
 * - ExpoNotificationsHandlerModule (hit immediately by `setNotificationHandler`,
 *   the very first call in notificationService.ts, at module scope)
 * - ExpoTopicSubscriptionModule (the module named in the original crash report;
 *   Android-only, registered by expo-notifications/src/TopicSubscriptionModule.android.ts)
 *
 * Confirmed by reading node_modules/expo-notifications/src/*.native.ts and
 * *.android.ts source directly — these are the literal string names passed to
 * requireNativeModule(...) in that package, not guessed.
 */

let hasLoggedUnavailable = false;

function logUnavailableOnce() {
  if (!hasLoggedUnavailable) {
    hasLoggedUnavailable = true;
    console.log(
      '[notifications] Native notification modules unavailable in this environment ' +
      '(expected in Expo Go on Android since SDK 53) — notification features will ' +
      'silently no-op. This does NOT affect iOS Expo Go or production/EAS builds.'
    );
  }
}

let cachedAvailability: boolean | null = null;

/**
 * Returns true only if expo-notifications' native modules are actually
 * registered in the current runtime. Safe to call on any platform at any
 * time — never throws, never touches `expo-notifications` itself.
 */
export function isExpoNotificationsAvailable(): boolean {
  if (cachedAvailability !== null) {
    return cachedAvailability;
  }

  try {
    // ExpoNotificationsHandlerModule is required on every platform (it's what
    // `setNotificationHandler` / scheduling / permissions all route through).
    // ExpoTopicSubscriptionModule is Android-only (never registered on iOS,
    // even in a real build) and was the module named in the original crash
    // report, so we check it too but only to confirm the Android-specific
    // failure mode — never require it to exist on iOS.
    const handlerModule = requireOptionalNativeModule('ExpoNotificationsHandlerModule');

    cachedAvailability = !!handlerModule;
  } catch (error) {
    console.warn('[notifications] Error checking native module availability:', error);
    cachedAvailability = false;
  }

  if (!cachedAvailability) {
    logUnavailableOnce();
  }

  return cachedAvailability;
}
