import getTablesItemsCounts from '../data/getTablesItemCounts.js';
import { CloudWatchClient, PutMetricDataCommand } from '@aws-sdk/client-cloudwatch'

export const handler = async () => {
  if (process.env.SLS_STAGE !== 'production') return;

  const cloudwatch = new CloudWatchClient();
  const counts = await getTablesItemsCounts();

  const input = {
    Namespace: 'DynamoDB Table Items Count',
    MetricData: (
      Object.keys(counts).map((tableName) => ({
        MetricName: 'Table Items Count',
        Dimensions: [{
          Name: 'TableName',
          Value: tableName,
        }],
        Value: counts[tableName],
        Unit: 'Count',
      }))
    ),
  };
  const command = new PutMetricDataCommand(input);
  await cloudwatch.send(command);
};
