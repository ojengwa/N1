import React, {Component, PropTypes} from 'react'
import moment from 'moment'
import {DateUtils} from 'nylas-exports'
import {PLUGIN_ID, DATE_FORMAT_SHORT} from './send-later-constants'

export default class SendLaterState extends Component {
  static displayName = 'SendLaterState';

  static propTypes = {
    draft: PropTypes.object,
  };

  render() {
    const {draft} = this.props
    const metadata = draft.metadataForPluginId(PLUGIN_ID)
    if (metadata) {
      const {sendLaterDate} = metadata
      const formatted = DateUtils.format(moment(sendLaterDate), DATE_FORMAT_SHORT)
      return (
        <em className="send-later-state">
          {`Scheduled for ${formatted}`}
        </em>
      )
    }
    return <span />
  }
}
