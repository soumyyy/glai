import { Platform } from 'react-native';
import {
  isHealthDataAvailableAsync,
  queryQuantitySamples,
  requestAuthorization,
  type QuantitySampleTyped,
} from '@kingstinct/react-native-healthkit';

type BloodGlucoseQuantitySample = QuantitySampleTyped<'HKQuantityTypeIdentifierBloodGlucose'>;

export type GlucoseUnit = BloodGlucoseQuantitySample['unit'];

export interface BloodGlucoseSample {
  id: string;
  startDate: string;
  endDate: string;
  sourceName?: string;
  value: number;
  unit: GlucoseUnit;
  metadata?: Record<string, unknown>;
}

function ensureIos() {
  if (Platform.OS !== 'ios') {
    throw new Error('HealthKit is only available on iOS.');
  }
}

function normalizeSample(sample: BloodGlucoseQuantitySample): BloodGlucoseSample {
  return {
    id: sample.uuid,
    startDate: sample.startDate.toISOString(),
    endDate: sample.endDate.toISOString(),
    sourceName: sample.sourceRevision.source.name,
    value: Number(sample.quantity),
    unit: sample.unit,
    metadata: sample.metadata as Record<string, unknown>,
  };
}

export async function isHealthKitAvailable(): Promise<boolean> {
  if (Platform.OS !== 'ios') {
    return false;
  }

  return isHealthDataAvailableAsync();
}

export async function requestBloodGlucoseReadAccess(): Promise<void> {
  ensureIos();
  await requestAuthorization({
    toRead: ['HKQuantityTypeIdentifierBloodGlucose'],
  });
}

export async function getRecentBloodGlucoseSamples(options: {
  startDate: string;
  endDate?: string;
  unit?: GlucoseUnit;
  limit?: number;
  ascending?: boolean;
}): Promise<BloodGlucoseSample[]> {
  ensureIos();

  const results = await queryQuantitySamples('HKQuantityTypeIdentifierBloodGlucose', {
    unit: options.unit,
    ascending: options.ascending,
    limit: options.limit ?? 20,
    filter: {
      date: {
        startDate: new Date(options.startDate),
        endDate: options.endDate ? new Date(options.endDate) : new Date(),
      },
    },
  });

  return results.map((sample) => normalizeSample(sample));
}
