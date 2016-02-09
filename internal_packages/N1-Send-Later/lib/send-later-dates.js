/** @babel */
import moment from 'moment'

export function minutesFromNow(minutes, now = moment()) {
  return now.add(minutes, 'minutes').utc().format();
}

export function In1Hour() {
  return minutesFromNow(60);
}

export function In2Hours() {
  return minutesFromNow(120);
}

export function In4Hours() {
  return minutesFromNow(240);
}

export function TomorrowMorning(now = moment()) {
  return now.add(1, 'day').hours(9).minutes(0).seconds(0).utc().format();
}

export function TomorrowEvening(now = moment()) {
  return now.add(1, 'day').hours(19).minutes(0).seconds(0).utc().format();
}

export function ThisWeekend(now = moment()) {
  return now.day(6).hours(9).minutes(0).seconds(0).utc().format();
}

export function NextWeek(now = moment()) {
  return now.day(8).hours(9).minutes(0).seconds(0).utc().format();
}
