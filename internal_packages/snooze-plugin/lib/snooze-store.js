/** @babel */
import moment from 'moment';
import {Rx, Actions, DatabaseStore, Thread} from 'nylas-exports';
import {
  moveThreadsToSnooze,
  moveThreadsFromSnooze,
} from './utils/snooze-category-helpers';
import SnoozeActions from './snooze-actions'


const INTERVAL = 30000
const PLUGIN_ID = "59t1k7y44kf8t450qsdw121ui"


class SnoozeStore {

  constructor(interval = INTERVAL, pluginId = PLUGIN_ID) {
    this.pluginId = pluginId
    this.snoozedThreads = new Map()
    this.queryDisposable = {dispose: ()=> {}}
    this.interval = setInterval(this.processAllSnoozedThreads, interval)

    SnoozeActions.snoozeThreads.listen(this.onSnoozeThreads)

    this.initSnoozedThreads()
  }

  initSnoozedThreads() {
    const query = DatabaseStore.findAll(
      Thread, [Thread.attributes.pluginMetadata.contains(this.pluginId)]
    )
    this.queryDisposable = (
      Rx.Observable.fromQuery(query).subscribe(this.onSnoozedThreadsChanged)
    )
  }

  onSnoozedThreadsChanged = (threads)=> {
    this.snoozedThreads.clear()
    threads.forEach(thread => {
      const snoozeDate = thread.metadataForPluginId(this.pluginId).snoozeDate
      if (!snoozeDate) return;

      const threadIds = this.snoozedThreads.get(snoozeDate) || new Set()
      threadIds.add(thread.id)
      this.snoozedThreads.set(snoozeDate, threadIds)
    })
  };

  onSnoozeThreads = (threads, snoozeDate)=> {
    moveThreadsToSnooze(threads)
    .then(()=> {
      Actions.setMetadata(threads, this.pluginId, {snoozeDate})
    })
    .catch((error)=> {
      // TODO
      console.error(error)
    })
  };

  processSnoozedThreads = (snoozeDate, threadIds)=> {
    const snoozeMoment = moment(snoozeDate)
    if (moment().isAfter(snoozeMoment)) {
      return (
        DatabaseStore.modelify(Thread, Array.from(threadIds))
        .then((threads)=> {
          this.snoozedThreads.delete(snoozeDate)
          Actions.setMetadata(threads, this.pluginId, {snoozeDate: null})
          return Promise.resolve(threads)
        })
        .then(moveThreadsFromSnooze)
        .catch((error)=> {
          // TODO
          console.error(error)
        })
      )
    }
    return Promise.resolve()
  };

  processAllSnoozedThreads = ()=> {
    const promises = []
    for (const [snoozeDate, threadIds] of this.snoozedThreads) {
      promises.push(this.processSnoozedThreads(snoozeDate, threadIds))
    }
    return Promise.all(promises)
  };

  deactivate() {
    clearInterval(this.interval);
    this.queryDisposable.dispose()
  }
}

export default SnoozeStore;
