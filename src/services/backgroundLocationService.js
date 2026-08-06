/**
 * backgroundLocationService.js
 * PART 1 OF 3
 *
 * Continue with Part 2 immediately after this.
 */

import * as Location from "expo-location";
import * as TaskManager from "expo-task-manager";
import AsyncStorage from "@react-native-async-storage/async-storage";
import NetInfo from "@react-native-community/netinfo";

export const LOCATION_TASK_NAME = "trip-background-location-task";

const QUEUE_KEY_PREFIX = "@trip_point_queue:";
const ROUTE_HISTORY_KEY_PREFIX = "@trip_route_history:";
const ACTIVE_TRACKING_KEY = "@trip_active_tracking";
const PENDING_UPLOAD_KEY = "@trip_pending_upload";
const TRACKING_PHASES = ["outbound", "stay", "return"];

const MAX_ACCEPTABLE_ACCURACY_M = 30;
const MAX_PLAUSIBLE_SPEED_KMH = 160;
const MAX_QUEUE_SIZE = 25000;

const LOCATION_UPDATE_INTERVAL = 2000;
const LOCATION_DISTANCE_INTERVAL = 3;

let uploading = false;
let uploadWorker = null;

/**
 * API upload callback.
 *
 * This will be injected from tripService.js
 *
 * uploadFunction(tripId, points)
 */
let uploadFunction = null;

export function registerUploadFunction(fn) {
  uploadFunction = fn;
}

function haversineMeters(a, b) {
  const R = 6371000;

  const toRad = (v) => (v * Math.PI) / 180;

  const dLat = toRad(b.latitude - a.latitude);

  const dLon = toRad(b.longitude - a.longitude);

  const lat1 = toRad(a.latitude);

  const lat2 = toRad(b.latitude);

  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(dLon / 2) ** 2;

  return (
    2 *
    R *
    Math.atan2(
      Math.sqrt(h),
      Math.sqrt(1 - h)
    )
  );
}

async function getTrackingState() {
  const raw = await AsyncStorage.getItem(
    ACTIVE_TRACKING_KEY
  );

  if (!raw) return null;

  return JSON.parse(raw);
}

async function saveTrackingState(state) {
  await AsyncStorage.setItem(
    ACTIVE_TRACKING_KEY,
    JSON.stringify(state)
  );
}

async function getPendingUpload() {
  const raw = await AsyncStorage.getItem(PENDING_UPLOAD_KEY);
  return raw ? JSON.parse(raw) : null;
}

async function savePendingUpload(tripId) {
  await AsyncStorage.setItem(PENDING_UPLOAD_KEY, JSON.stringify({ tripId }));
}

function getQueueKey(phase) {
  return `${QUEUE_KEY_PREFIX}${phase}`;
}

function getRouteHistoryKey(phase) {
  return `${ROUTE_HISTORY_KEY_PREFIX}${phase}`;
}

async function ensureQueueExists(phase) {
  const key = getQueueKey(phase);

  const existing =
    await AsyncStorage.getItem(key);

  if (!existing) {
    await AsyncStorage.setItem(
      key,
      JSON.stringify([])
    );
  }
}

export async function getQueuedPoints(
  phase
) {
  const raw =
    await AsyncStorage.getItem(
      getQueueKey(phase)
    );

  return raw ? JSON.parse(raw) : [];
}

/**
 * Returns the complete locally recorded route for a phase. Unlike the upload
 * queue, this history is retained after each successful sync so the live map
 * can keep drawing the travelled route.
 */
export async function getRecordedPoints(phase) {
  const raw = await AsyncStorage.getItem(getRouteHistoryKey(phase));
  return raw ? JSON.parse(raw) : [];
}

export async function clearQueuedPoints(
  phase
) {
  await AsyncStorage.removeItem(
    getQueueKey(phase)
  );
}

async function appendRecordedPoints(phase, points) {
  const key = getRouteHistoryKey(phase);
  const raw = await AsyncStorage.getItem(key);
  const history = raw ? JSON.parse(raw) : [];
  const merged = [...history, ...points];
  if (merged.length > MAX_QUEUE_SIZE) merged.splice(0, merged.length - MAX_QUEUE_SIZE);
  await AsyncStorage.setItem(key, JSON.stringify(merged));
}

export async function getPendingPointCount(
  phase
) {
  const points =
    await getQueuedPoints(phase);

  return points.length;
}

TaskManager.defineTask(
  LOCATION_TASK_NAME,
  async ({ data, error }) => {
    if (error) {
      console.warn(
        "[BackgroundTracking]",
        error.message
      );
      return;
    }

    if (!data) return;

    const tracking =
      await getTrackingState();

    if (!tracking) return;

    const { phase } = tracking;

    const queueKey = getQueueKey(phase);

    const history = await getRecordedPoints(phase);

    const existingRaw =
      await AsyncStorage.getItem(
        queueKey
      );

    const existing = existingRaw
      ? JSON.parse(existingRaw)
      : [];

    const last =
      history.length > 0
        ? history[history.length - 1]
        : null;

    const accepted = [];

    for (const loc of data.locations) {
      const point = {
        latitude: loc.coords.latitude,

        longitude: loc.coords.longitude,

        accuracy: loc.coords.accuracy,

        altitude: loc.coords.altitude,

        altitudeAccuracy:
          loc.coords.altitudeAccuracy,

        speed: loc.coords.speed,

        heading: loc.coords.heading,

        timestamp: loc.timestamp,

        batteryLevel: null,

        provider: "gps",

        isMocked:
          loc.mocked ?? false,

        tripPhase: phase,
      };

      if (
        point.accuracy != null &&
        point.accuracy >
          MAX_ACCEPTABLE_ACCURACY_M
      ) {
        continue;
      }

      const prev =
        accepted[
          accepted.length - 1
        ] || last;

      if (prev) {
        const dt =
          (point.timestamp -
            prev.timestamp) /
          1000;

        if (dt > 0) {
          const distance =
            haversineMeters(
              prev,
              point
            );

          const speed =
            (distance / dt) * 3.6;

          if (
            speed >
            MAX_PLAUSIBLE_SPEED_KMH
          ) {
            continue;
          }
        }
      }

      accepted.push(point);
    }

    if (accepted.length === 0) {
      return;
    }

    const merged = [
      ...existing,
      ...accepted,
    ];

    if (
      merged.length >
      MAX_QUEUE_SIZE
    ) {
      merged.splice(
        0,
        merged.length -
          MAX_QUEUE_SIZE
      );
    }

    await AsyncStorage.setItem(
      queueKey,
      JSON.stringify(merged)
    );

    await appendRecordedPoints(phase, accepted);
  }
);

/**
 * backgroundLocationService.js
 * PART 2 OF 3
 */

export async function requestBackgroundLocationPermissions() {
  const fg = await Location.requestForegroundPermissionsAsync();

  if (fg.status !== "granted") {
    return false;
  }

  const bg = await Location.requestBackgroundPermissionsAsync();

  return bg.status === "granted";
}

export async function startBackgroundTracking(
  tripId,
  phase
) {
  // Do not overwrite an earlier trip that is still waiting to sync offline.
  if (await getPendingUpload()) {
    await uploadPendingPoints();
    if (await getPendingUpload()) {
      throw new Error("A previous trip is waiting to sync. Connect to the internet before starting another trip.");
    }
  }

  // A new trip always starts with fresh upload queues and map history.
  await clearAllQueues();

  await saveTrackingState({
    tripId,
    phase,
    startedAt: Date.now(),
  });

  await ensureQueueExists(phase);

  const alreadyRunning =
    await Location.hasStartedLocationUpdatesAsync(
      LOCATION_TASK_NAME
    );

  if (alreadyRunning) {
    await Location.stopLocationUpdatesAsync(
      LOCATION_TASK_NAME
    );
  }

  await Location.startLocationUpdatesAsync(
    LOCATION_TASK_NAME,
    {
      accuracy:
        Location.Accuracy.BestForNavigation,

      timeInterval:
        LOCATION_UPDATE_INTERVAL,

      distanceInterval:
        LOCATION_DISTANCE_INTERVAL,

      deferredUpdatesInterval: 5000,

      pausesUpdatesAutomatically: false,

      activityType:
        Location.ActivityType
          .AutomotiveNavigation,

      showsBackgroundLocationIndicator: true,

      foregroundService: {
        notificationTitle:
          "Trip Tracking",

        notificationBody:
          "Tracking engineer location in background.",

        notificationColor:
          "#0B5FFF",

        killServiceOnDestroy: false,
      },
    }
  );
}

export async function stopBackgroundTracking() {
  const running =
    await Location.hasStartedLocationUpdatesAsync(
      LOCATION_TASK_NAME
    );

  if (running) {
    await Location.stopLocationUpdatesAsync(
      LOCATION_TASK_NAME
    );
  }

  await AsyncStorage.removeItem(
    ACTIVE_TRACKING_KEY
  );

  stopUploadWorker();
}

export async function restoreTracking() {
  return await Location.hasStartedLocationUpdatesAsync(
    LOCATION_TASK_NAME
  );
}

export async function uploadPendingPoints() {
  if (uploading) {
    return;
  }

  if (!uploadFunction) {
    return;
  }

  const tracking = await getTrackingState();
  const pending = await getPendingUpload();
  const tripId = tracking?.tripId || pending?.tripId;

  if (!tripId) {
    return;
  }

  uploading = true;

  try {
    let allUploaded = true;

    for (const phase of TRACKING_PHASES) {
      const queue = await getQueuedPoints(phase);
      if (queue.length === 0) continue;

      try {
        await uploadFunction(tripId, queue);
        await clearQueuedPoints(phase);
      } catch (e) {
        allUploaded = false;
        console.log("[Tracking Upload]", e.message);
      }
    }

    if (allUploaded) {
      await AsyncStorage.removeItem(PENDING_UPLOAD_KEY);
    }
  } catch (e) {
    console.log(
      "[Tracking Upload]",
      e.message
    );
  } finally {
    uploading = false;
  }
}

export function startUploadWorker() {
  if (uploadWorker) {
    return;
  }

  uploadWorker = setInterval(
    async () => {
      await uploadPendingPoints();
    },
    15000
  );
}

export function stopUploadWorker() {
  if (!uploadWorker) {
    return;
  }

  clearInterval(uploadWorker);

  uploadWorker = null;
}

/**
 * backgroundLocationService.js
 * PART 3 OF 3 (FINAL)
 */

let netInfoUnsubscribe = null;

/**
 * Automatically sync queued points whenever
 * internet connectivity is restored.
 */
export function startNetworkSync() {
  if (netInfoUnsubscribe) {
    return;
  }

  netInfoUnsubscribe = NetInfo.addEventListener(
    async (state) => {
      if (
        state.isConnected &&
        state.isInternetReachable !== false
      ) {
        await uploadPendingPoints();
      }
    }
  );
}

/**
 * Stop network listener.
 */
export function stopNetworkSync() {
  if (netInfoUnsubscribe) {
    netInfoUnsubscribe();
    netInfoUnsubscribe = null;
  }
}

/**
 * Returns complete tracking state.
 *
 * Example:
 *
 * {
 *   tripId,
 *   phase,
 *   startedAt
 * }
 */
export async function getCurrentTrackingState() {
  return await getTrackingState();
}

/**
 * Returns true if background tracking
 * is currently active.
 */
export async function isTrackingRunning() {
  return await Location.hasStartedLocationUpdatesAsync(
    LOCATION_TASK_NAME
  );
}

/**
 * Change current phase without restarting GPS.
 *
 * Example:
 *
 * outbound -> stay
 * stay -> return
 */
export async function updateTrackingPhase(
  phase
) {
  const tracking =
    await getTrackingState();

  if (!tracking) {
    return;
  }

  tracking.phase = phase;

  await saveTrackingState(tracking);

  await ensureQueueExists(phase);
}

/**
 * Flush queue before trip completion.
 */
export async function finishTracking() {
  const tracking = await getTrackingState();

  try {
    await uploadPendingPoints();
  } catch (e) {
    console.log(
      "[Tracking]",
      e.message
    );
  }

  if (tracking && (await getTotalPendingPoints()) > 0) {
    await savePendingUpload(tracking.tripId);
  }

  await stopBackgroundTracking();
}

/**
 * Returns total queued locations
 * across all phases.
 */
export async function getTotalPendingPoints() {
  const outbound =
    await getQueuedPoints("outbound");

  const stay =
    await getQueuedPoints("stay");

  const ret =
    await getQueuedPoints("return");

  return (
    outbound.length +
    stay.length +
    ret.length
  );
}

/**
 * Removes every cached location.
 *
 * Useful after successful trip submission.
 */
export async function clearAllQueues() {
  await clearQueuedPoints("outbound");

  await clearQueuedPoints("stay");

  await clearQueuedPoints("return");

  await AsyncStorage.multiRemove([
    getRouteHistoryKey("outbound"),
    getRouteHistoryKey("stay"),
    getRouteHistoryKey("return"),
  ]);
}

/**
 * Returns latest queued point.
 */
export async function getLatestPoint(
  phase
) {
  const points =
    await getQueuedPoints(phase);

  if (points.length === 0) {
    return null;
  }

  return points[points.length - 1];
}

/**
 * Initializes tracking service.
 *
 * Call once after login.
 */
export async function initializeTracking() {
  startNetworkSync();

  // Retry a completed offline trip as soon as the engineer opens the app.
  await uploadPendingPoints();

  const running =
    await isTrackingRunning();

  if (running) {
    startUploadWorker();
  }
}

/**
 * Shutdown tracking service.
 *
 * Call during logout. If a trip is still actively being tracked (engineer
 * logged out mid-trip instead of ending it properly), this also stops the
 * OS-level location task — otherwise GPS keeps running in the background
 * indefinitely with nothing left to poll or upload the points it collects.
 */
export async function destroyTracking() {
  stopUploadWorker();

  stopNetworkSync();

  const stillRunning = await isTrackingRunning();
  if (stillRunning) {
    await Location.stopLocationUpdatesAsync(LOCATION_TASK_NAME);
  }
}
