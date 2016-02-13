/** @babel */
import {Actions, NylasAPI, AccountStore} from 'nylas-exports';
import {moveThreadsToSnooze} from './utils/snooze-category-helpers';
import SnoozeActions from './snooze-actions'


const PLUGIN_ID = "59t1k7y44kf8t450qsdw121ui"
const PLUGIN_NAME = "Snooze Plugin"

class SnoozeStore {

  constructor(pluginId = PLUGIN_ID) {
    this.pluginId = pluginId

    SnoozeActions.snoozeThreads.listen(this.onSnoozeThreads)
  }

  setMetadata = (threads, metadata)=> {
    const accounts = AccountStore.accountsForItems(threads)
    const promises = accounts.map((acc)=> {
      return NylasAPI.authPlugin(this.pluginId, PLUGIN_NAME, acc.id)
    })
    return Promise.all(promises).then(()=> {
      Actions.setMetadata(threads, this.pluginId, metadata)
    })
  };

  onSnoozeThreads = (threads, snoozeDate)=> {
    moveThreadsToSnooze(threads)
    .then((updatedThreads)=> {
      this.setMetadata(updatedThreads, {snoozeDate})
    })
    .catch((error)=> {
      // TODO
      console.error(error)
    })
  };
}

export default SnoozeStore;
