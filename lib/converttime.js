import moment from 'moment';

const FORMAT = 'HH:mm:ss.SSS';

export function convertTimeToTimestamp(time) {
  return moment.utc(time, FORMAT).set({ 'year': 1970, 'month': 0, 'date': 1 }).valueOf();
}

export function convertTimestampToTime(timestamp) {
  return moment.utc(timestamp, 'x').format(FORMAT);
}
