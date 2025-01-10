export namespace FraudDetection {
  export interface VerificationParams {
    userId: string;
    idNumber: string;
    similarity: number;
    deviceInfo: {
      deviceId: string;
      userAgent: string;
      ipAddress: string;
    };
    location: {
      country: string;
      city: string;
      coordinates?: {
        latitude: number;
        longitude: number;
      };
    };
  }

  export interface Check {
    type: 'similarity' | 'attempts' | 'time' | 'blacklist' | 'pattern';
    suspicious: boolean;
    score?: number;
    count?: number;
    hour?: number;
    details?: any;
  }

  export interface Result {
    allowed: boolean;
    checks: Check[];
    warnings: Check[];
  }

  export interface Attempt {
    id: string;
    userId: string;
    idNumber: string;
    timestamp: string;
    similarity: number;
    deviceInfo: {
      deviceId: string;
      userAgent: string;
      ipAddress: string;
    };
    location: {
      country: string;
      city: string;
    };
  }

  export interface PatternAnalysis {
    suspicious: boolean;
    patterns: {
      timeDistribution: TimeDistribution;
      locationPatterns: LocationPatterns;
      devicePatterns: DevicePatterns;
    };
  }

  export interface TimeDistribution {
    distribution: number[];
    suspicious: boolean;
    anomalies?: number[];
  }

  export interface LocationPatterns {
    locations: string[];
    suspicious: boolean;
    rapidChanges?: boolean;
  }

  export interface DevicePatterns {
    devices: string[];
    suspicious: boolean;
    unusualSwitching?: boolean;
  }
} 