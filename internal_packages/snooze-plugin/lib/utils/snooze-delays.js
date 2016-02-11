/** @babel */
import moment from 'moment';

const Hours = {
  Morning: 9,
  Evening: 19,
}

const Days = {
  NextMonday: 8,
  ThisWeekend: 6,
}

moment.prototype.oclock = function oclock() {
  return this.minute(0).second(0)
}

moment.prototype.morning = function morning(morningHour = Hours.Morning) {
  return this.hour(morningHour).oclock()
}

moment.prototype.evening = function evening(eveningHour = Hours.Evening) {
  return this.hour(eveningHour).oclock()
}

function format(date) {
  return date.format()
}

export function InOneMinute(now = moment()) {
  const then = now.add(1, 'minute')
  return format(then)
}

export function LaterToday(now = moment()) {
  const then = now.add(3, 'hours').oclock()
  return format(then)
}

export function Tonight(now = moment()) {
  if (now.hour() >= Hours.Evening) {
    now.add(1, 'day')
  }
  const then = now.evening()
  return format(then)
}

export function Tomorrow(now = moment()) {
  const then = now.add(1, 'day').morning()
  return format(then)
}

export function ThisWeekend(now = moment()) {
  const then = now.day(Days.ThisWeekend).morning()
  return format(then)
}

export function NextWeek(now = moment()) {
  const then = now.day(Days.NextMonday).morning()
  return format(then)
}

export function NextMonth(now = moment()) {
  const then = now.add(1, 'month').date(1).morning()
  return format(then)
}
