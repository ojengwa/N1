/** @babel */
import Reflux from 'reflux';

const SendLaterActions = Reflux.createActions([
  'sendLater',
])

for (const key in SendLaterActions) {
  SendLaterActions[key].sync = true
}

export default SendLaterActions
