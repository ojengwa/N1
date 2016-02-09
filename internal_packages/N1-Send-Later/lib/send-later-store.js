/** @babel */
import {Message, DatabaseStore} from 'nylas-exports'
import SendLaterActions from './send-later-actions'


class SendLaterStore {

  constructor(cloudStorage) {
    this.storage = cloudStorage
    SendLaterActions.sendLater.listen(this.onSendLater)
  }

  onSendLater(draftClientId, sendLaterDate) {
    DatabaseStore.modelify(Message, [draftClientId])
    .then((messages)=> {
      this.storage.associateMetadata({objects: messages, data: sendLaterDate})
    })
  }
}


export default SendLaterStore
