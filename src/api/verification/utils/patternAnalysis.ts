import { FraudDetection } from '../types/fraudDetection';

const SUSPICIOUS_THRESHOLDS = {
  attempts: 3,
  locations: 2,
  devices: 2,
  timeWindow: 24 * 60 * 60 * 1000, // 24 hours
  stdDevThreshold: 2 // Standard deviations for anomaly detection
};

export async function analyzePatterns(
  attempts: FraudDetection.Attempt[]
): Promise<FraudDetection.PatternAnalysis> {
  const patterns = {
    timeDistribution: analyzeTimeDistribution(attempts),
    locationPatterns: analyzeLocationPatterns(attempts),
    devicePatterns: analyzeDevicePatterns(attempts)
  };

  return {
    suspicious: evaluatePatterns(patterns),
    patterns
  };
}

function analyzeTimeDistribution(
  attempts: FraudDetection.Attempt[]
): FraudDetection.TimeDistribution {
  const hourCounts = new Array(24).fill(0);
  const anomalies: number[] = [];

  // Count attempts per hour
  attempts.forEach(attempt => {
    const hour = new Date(attempt.timestamp).getHours();
    hourCounts[hour]++;
  });

  // Detect anomalies using standard deviation
  const mean = hourCounts.reduce((a, b) => a + b) / hourCounts.length;
  const stdDev = Math.sqrt(
    hourCounts.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / hourCounts.length
  );

  hourCounts.forEach((count, hour) => {
    if (Math.abs(count - mean) > SUSPICIOUS_THRESHOLDS.stdDevThreshold * stdDev) {
      anomalies.push(hour);
    }
  });

  return {
    distribution: hourCounts,
    suspicious: anomalies.length > 0,
    anomalies
  };
}

function analyzeLocationPatterns(
  attempts: FraudDetection.Attempt[]
): FraudDetection.LocationPatterns {
  const locations = new Set(attempts.map(attempt => attempt.location.country));
  const rapidChanges = detectRapidLocationChanges(attempts);

  return {
    locations: Array.from(locations),
    suspicious: locations.size >= SUSPICIOUS_THRESHOLDS.locations || rapidChanges,
    rapidChanges
  };
}

function analyzeDevicePatterns(
  attempts: FraudDetection.Attempt[]
): FraudDetection.DevicePatterns {
  const devices = new Set(attempts.map(attempt => attempt.deviceInfo.deviceId));
  const unusualSwitching = detectUnusualDeviceSwitching(attempts);

  return {
    devices: Array.from(devices),
    suspicious: devices.size >= SUSPICIOUS_THRESHOLDS.devices || unusualSwitching,
    unusualSwitching
  };
}

function detectRapidLocationChanges(attempts: FraudDetection.Attempt[]): boolean {
  if (attempts.length < 2) return false;

  const sortedAttempts = [...attempts].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  for (let i = 1; i < sortedAttempts.length; i++) {
    const timeDiff = new Date(sortedAttempts[i].timestamp).getTime() - 
                     new Date(sortedAttempts[i-1].timestamp).getTime();
    
    if (timeDiff < SUSPICIOUS_THRESHOLDS.timeWindow && 
        sortedAttempts[i].location.country !== sortedAttempts[i-1].location.country) {
      return true;
    }
  }

  return false;
}

function detectUnusualDeviceSwitching(attempts: FraudDetection.Attempt[]): boolean {
  if (attempts.length < 2) return false;

  const sortedAttempts = [...attempts].sort((a, b) => 
    new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );

  for (let i = 1; i < sortedAttempts.length; i++) {
    const timeDiff = new Date(sortedAttempts[i].timestamp).getTime() - 
                     new Date(sortedAttempts[i-1].timestamp).getTime();
    
    if (timeDiff < SUSPICIOUS_THRESHOLDS.timeWindow && 
        sortedAttempts[i].deviceInfo.deviceId !== sortedAttempts[i-1].deviceInfo.deviceId) {
      return true;
    }
  }

  return false;
}

function evaluatePatterns(patterns: FraudDetection.PatternAnalysis['patterns']): boolean {
  return patterns.timeDistribution.suspicious ||
         patterns.locationPatterns.suspicious ||
         patterns.devicePatterns.suspicious;
} 