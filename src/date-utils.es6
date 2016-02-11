/** @babel */
import moment from 'moment'
import chrono from 'chrono-node'

const DateUtils = {

  format(momentDate, formatString) {
    if (!momentDate) return null;
    return momentDate.format(formatString);
  },

  utc(momentDate) {
    if (!momentDate) return null;
    return momentDate.utc();
  },

  minutesFromNow(minutes, now = moment()) {
    return now.add(minutes, 'minutes');
  },

  in1Hour() {
    return DateUtils.minutesFromNow(60);
  },

  in2Hours() {
    return DateUtils.minutesFromNow(120);
  },

  in4Hours() {
    return DateUtils.minutesFromNow(240);
  },

  tomorrowMorning(now = moment()) {
    return now.add(1, 'day').hours(9).minutes(0).seconds(0);
  },

  tomorrowEvening(now = moment()) {
    return now.add(1, 'day').hours(19).minutes(0).seconds(0);
  },

  thisWeekend(now = moment()) {
    return now.day(6).hours(9).minutes(0).seconds(0);
  },

  nextWeek(now = moment()) {
    return now.day(8).hours(9).minutes(0).seconds(0);
  },

  /**
   * Can take almost any string.
   * e.g. "Next monday at 2pm"
   * @param {string} dateLikeString - a string representing a date.
   * @return {moment} - moment object representing date
   */
  fromString(dateLikeString) {
    const date = chrono.parseDate(dateLikeString)
    if (!date) {
      return null
    }
    return moment(date)
  },
}

export default DateUtils


