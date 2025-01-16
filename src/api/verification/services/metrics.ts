import { CloudWatchClient, PutMetricDataCommand } from "@aws-sdk/client-cloudwatch";

const cloudwatch = new CloudWatchClient({ 
  region: process.env.AWS_REGION
});
const NAMESPACE = 'FaceVerification';

export const MetricsService = {
  async record(params: {
    metricName: string;
    dimensions: Record<string, string>;
    value: number;
  }): Promise<void> {
    await cloudwatch.send(new PutMetricDataCommand({
      Namespace: NAMESPACE,
      MetricData: [{
        MetricName: params.metricName,
        Value: params.value,
        Unit: 'None',
        Dimensions: Object.entries(params.dimensions).map(([Name, Value]) => ({
          Name,
          Value
        }))
      }]
    }));
  },

  async incrementCounter(metricName: string, dimensions: Record<string, string> = {}): Promise<void> {
    await this.record({
      metricName,
      dimensions,
      value: 1
    });
  },

  async recordVerificationResult(similarity: number, verified: boolean): Promise<void> {
    await Promise.all([
      this.record({
        metricName: 'FaceSimilarity',
        dimensions: { Result: verified ? 'Verified' : 'Failed' },
        value: similarity
      }),
      this.incrementCounter(verified ? 'SuccessfulVerifications' : 'FailedVerifications')
    ]);
  }
};
