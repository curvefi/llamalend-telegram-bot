import sns from '../../utils/SnsInstance.js';
import { PublishCommand } from '@aws-sdk/client-sns';

const notifyNewAddressAdded = async ({ telegramUserId, newAddress }) => (
  sns.send(
    new PublishCommand({
      Message: JSON.stringify({ telegramUserId, newAddress }),
      TopicArn: `arn:aws:sns:us-east-1:${process.env.AWS_ACCOUNT_ID}:dispatch-new-address`,
    }),
  )
);

export default notifyNewAddressAdded;
