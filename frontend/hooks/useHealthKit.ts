/**
 * ARENAKORE — useHealthKit Hook
 * ═══════════════════════════════════════════════
 * Native Apple HealthKit integration via react-native-health.
 * Reads Steps, Heart Rate, Active Calories, and Workouts.
 * Auto-syncs to backend `/api/health/ingest` endpoint.
 * 
 * iOS-only: gracefully returns null data on Android/web.
 */
import { useEffect, useState, useCallback, useRef } from 'react';
import { Platform, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

// HealthKit types - conditional import to avoid crash on non-iOS
let AppleHealthKit: any = null;
let HealthKitPermissions: any = null;

if (Platform.OS === 'ios') {
  try {
    const HealthModule = require('react-native-health');
    AppleHealthKit = HealthModule.default || HealthModule;
    HealthKitPermissions = HealthModule.HealthKitPermissions || {};
  } catch (e) {
    console.log('[HealthKit] Module not available (expected on web/Android)');
  }
}

// ═══ TYPES ═══
export interface HealthKitData {
  steps: number;
  heartRate: number | null;
  restingHeartRate: number | null;
  activeCalories: number;
  walkingDistance: number; // meters
  flightsClimbed: number;
  workouts: WorkoutSample[];
}

interface WorkoutSample {
  id: string;
  type: string;
  start: string;
  end: string;
  calories: number;
  distance: number;
  duration: number; // minutes
}

const DEFAULT_DATA: HealthKitData = {
  steps: 0,
  heartRate: null,
  restingHeartRate: null,
  activeCalories: 0,
  walkingDistance: 0,
  flightsClimbed: 0,
  workouts: [],
};

const PERMISSIONS = {
  permissions: {
    read: [
      'StepCount',
      'HeartRate',
      'RestingHeartRate',
      'ActiveEnergyBurned',
      'DistanceWalkingRunning',
      'FlightsClimbed',
      'Workout',
    ],
    write: [],
  },
};

const SYNC_KEY = '@arenakore_healthkit_last_sync';

export function useHealthKit(token: string | null) {
  const [data, setData] = useState<HealthKitData>(DEFAULT_DATA);
  const [isAvailable, setIsAvailable] = useState(false);
  const [isAuthorized, setIsAuthorized] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [lastSync, setLastSync] = useState<string | null>(null);
  const syncInProgress = useRef(false);

  // ═══ CHECK AVAILABILITY ═══
  useEffect(() => {
    if (Platform.OS !== 'ios' || !AppleHealthKit) {
      setIsAvailable(false);
      return;
    }

    AppleHealthKit.isAvailable((err: any, available: boolean) => {
      if (err) {
        console.log('[HealthKit] Availability check error:', err);
        setIsAvailable(false);
        return;
      }
      setIsAvailable(available);
    });

    // Load last sync time
    AsyncStorage.getItem(SYNC_KEY).then(val => {
      if (val) setLastSync(val);
    });
  }, []);

  // ═══ INITIALIZE & REQUEST PERMISSIONS ═══
  const initialize = useCallback(() => {
    if (!isAvailable || !AppleHealthKit) return;

    setIsLoading(true);
    AppleHealthKit.initHealthKit(PERMISSIONS, (err: string) => {
      setIsLoading(false);
      if (err) {
        console.log('[HealthKit] Init error:', err);
        Alert.alert(
          'HEALTHKIT',
          'Impossibile inizializzare Apple Health. Verifica i permessi nelle Impostazioni.',
          [{ text: 'OK' }]
        );
        return;
      }
      console.log('[HealthKit] ✅ Authorized');
      setIsAuthorized(true);
    });
  }, [isAvailable]);

  // ═══ FETCH TODAY'S DATA ═══
  const fetchData = useCallback(async () => {
    if (!isAuthorized || !AppleHealthKit) return;

    setIsLoading(true);
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const options = {
      startDate: startOfDay.toISOString(),
      endDate: now.toISOString(),
    };

    try {
      const results = await Promise.allSettled([
        // Steps
        new Promise<number>((resolve) => {
          AppleHealthKit.getStepCount(options, (err: any, res: any) => {
            resolve(err ? 0 : Math.round(res?.value || 0));
          });
        }),
        // Heart Rate (latest)
        new Promise<number | null>((resolve) => {
          AppleHealthKit.getHeartRateSamples(
            { ...options, ascending: false, limit: 1 },
            (err: any, res: any) => {
              resolve(err || !res?.length ? null : Math.round(res[0].value));
            }
          );
        }),
        // Resting Heart Rate
        new Promise<number | null>((resolve) => {
          AppleHealthKit.getRestingHeartRate(options, (err: any, res: any) => {
            resolve(err ? null : Math.round(res?.value || 0));
          });
        }),
        // Active Calories
        new Promise<number>((resolve) => {
          AppleHealthKit.getActiveEnergyBurned(options, (err: any, res: any) => {
            if (err || !res?.length) { resolve(0); return; }
            const total = res.reduce((sum: number, s: any) => sum + (s.value || 0), 0);
            resolve(Math.round(total));
          });
        }),
        // Walking Distance
        new Promise<number>((resolve) => {
          AppleHealthKit.getDistanceWalkingRunning(options, (err: any, res: any) => {
            resolve(err ? 0 : Math.round(res?.value || 0));
          });
        }),
        // Flights Climbed
        new Promise<number>((resolve) => {
          AppleHealthKit.getFlightsClimbed(options, (err: any, res: any) => {
            resolve(err ? 0 : Math.round(res?.value || 0));
          });
        }),
        // Workouts
        new Promise<WorkoutSample[]>((resolve) => {
          AppleHealthKit.getSamples(
            { ...options, type: 'Workout' },
            (err: any, res: any) => {
              if (err || !res?.length) { resolve([]); return; }
              resolve(res.map((w: any) => ({
                id: w.id || `${w.start}-${w.end}`,
                type: w.activityName || 'Unknown',
                start: w.start,
                end: w.end,
                calories: Math.round(w.calories || 0),
                distance: Math.round(w.distance || 0),
                duration: Math.round((new Date(w.end).getTime() - new Date(w.start).getTime()) / 60000),
              })));
            }
          );
        }),
      ]);

      const newData: HealthKitData = {
        steps: results[0].status === 'fulfilled' ? results[0].value : 0,
        heartRate: results[1].status === 'fulfilled' ? results[1].value : null,
        restingHeartRate: results[2].status === 'fulfilled' ? results[2].value : null,
        activeCalories: results[3].status === 'fulfilled' ? results[3].value : 0,
        walkingDistance: results[4].status === 'fulfilled' ? results[4].value : 0,
        flightsClimbed: results[5].status === 'fulfilled' ? results[5].value : 0,
        workouts: results[6].status === 'fulfilled' ? results[6].value : [],
      };

      setData(newData);
      console.log('[HealthKit] 📊 Data fetched:', {
        steps: newData.steps,
        bpm: newData.heartRate,
        cal: newData.activeCalories,
      });
    } catch (e) {
      console.error('[HealthKit] Fetch error:', e);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthorized]);

  // ═══ SYNC TO BACKEND ═══
  const syncToBackend = useCallback(async () => {
    if (!token || !data.steps || syncInProgress.current) return;
    syncInProgress.current = true;

    try {
      const { BACKEND_BASE } = require('../utils/api');
      const payload = {
        source: 'APPLE_HEALTH',
        data_type: 'daily_summary',
        metrics: {
          steps: data.steps,
          heart_rate_bpm: data.heartRate,
          resting_hr: data.restingHeartRate,
          active_calories: data.activeCalories,
          distance_meters: data.walkingDistance,
          flights_climbed: data.flightsClimbed,
          workouts_count: data.workouts.length,
        },
        raw_samples: data.workouts.map(w => ({
          type: w.type,
          start: w.start,
          end: w.end,
          calories: w.calories,
          distance: w.distance,
        })),
        timestamp: new Date().toISOString(),
      };

      const res = await fetch(`${BACKEND_BASE}/api/health/ingest`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const now = new Date().toISOString();
        setLastSync(now);
        await AsyncStorage.setItem(SYNC_KEY, now);
        console.log('[HealthKit] ✅ Synced to backend');
      } else {
        console.warn('[HealthKit] Backend sync failed:', res.status);
      }
    } catch (e) {
      console.error('[HealthKit] Sync error:', e);
    } finally {
      syncInProgress.current = false;
    }
  }, [token, data]);

  // ═══ AUTO-FETCH ON AUTH ═══
  useEffect(() => {
    if (isAuthorized) {
      fetchData();
    }
  }, [isAuthorized, fetchData]);

  return {
    data,
    isAvailable,
    isAuthorized,
    isLoading,
    lastSync,
    initialize,
    fetchData,
    syncToBackend,
  };
}
