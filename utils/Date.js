import { localNumber } from './Number.js';

const getNowTimestamp = () => Math.trunc(+Date.now() / 1000);

const getHumanReadableTimeDifference = (
  timestampBefore,
  timestampAfter = getNowTimestamp()
) => {
  const secondDiff = timestampAfter - timestampBefore;
  const minuteDiff = Math.floor(secondDiff / 60);
  const hourDiff = Math.floor(secondDiff / 60 / 60);

  return (
    secondDiff > (60 * 60) ? `${localNumber(hourDiff)} ${hourDiff > 1 ? 'hours' : 'hour'}` :
      secondDiff > 60 ? `${localNumber(minuteDiff)} ${minuteDiff > 1 ? 'minutes' : 'minute'}` :
        `${localNumber(secondDiff)} ${secondDiff > 1 ? 'seconds' : 'second'}`
  );
};

export {
  getNowTimestamp,
  getHumanReadableTimeDifference,
};
