import { escapeNumberForTg } from './String.js';

const getNowTimestamp = () => Math.trunc(+Date.now() / 1000);

const getHumanReadableTimeDifference = (
  timestampBefore,
  timestampAfter = getNowTimestamp()
) => {
  const secondDiff = timestampAfter - timestampBefore;
  const minuteDiff = Math.floor(secondDiff / 60);
  const hourDiff = Math.floor(secondDiff / 60 / 60);

  return (
    secondDiff > (60 * 60) ? `${escapeNumberForTg(hourDiff)} ${hourDiff > 1 ? 'hours' : 'hour'}` :
      secondDiff > 60 ? `${escapeNumberForTg(minuteDiff)} ${minuteDiff > 1 ? 'minutes' : 'minute'}` :
        `${escapeNumberForTg(secondDiff)} ${secondDiff > 1 ? 'seconds' : 'second'}`
  );
};

export {
  getNowTimestamp,
  getHumanReadableTimeDifference,
};
