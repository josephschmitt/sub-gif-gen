import moment from 'moment';

export function convertTimeToTimestamp(time) {
  return moment.utc(time, "HH:mm:ss.SSS").set({ 'year': 1970, 'month': 0, 'date': 1 }).valueOf();
}

export function convertTimestampToTime(timestamp) {
  return moment.utc(timestamp, 'x').format("HH:mm:ss.SSS");
}
