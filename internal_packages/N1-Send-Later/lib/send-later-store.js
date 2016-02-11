/** @babel */
import {NylasAPI, Actions, Message, DatabaseStore} from 'nylas-exports'
import SendLaterActions from './send-later-actions'


const PLUGIN_ID = "aqx344zhdh6jyabqokejknkvr"
const PLUGIN_NAME = "Send Later"

class SendLaterStore {

  constructor(pluginId = PLUGIN_ID) {
    this.pluginId = pluginId
    SendLaterActions.sendLater.listen(this.onSendLater)
  }

  onSendLater = (draftClientId, sendLaterDate)=> {
    DatabaseStore.modelify(Message, [draftClientId])
    .then((messages)=> {
      const {accountId} = messages[0]
      return NylasAPI.authPlugin(this.pluginId, PLUGIN_NAME, accountId)
      .then(()=> {
        Actions.setMetadata(messages, this.pluginId, {sendLaterDate})
      })
    })
  };
}


export default SendLaterStore
