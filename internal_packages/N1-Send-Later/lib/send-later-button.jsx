/** @babel */
import React, {Component, PropTypes} from 'react'
import {Popover} from 'nylas-component-kit';
import SendLaterActions from './send-later-actions'
import * as SendLaterDates from './send-later-dates'


const SendLaterOptions = {
  'In 1 hour': SendLaterDates.In1Hour,
  'In 2 hours': SendLaterDates.In3Hours,
  'In 4 hours': SendLaterDates.In4Hours,
  'Tomorrow Morning': SendLaterDates.TomorrowMorning,
  'Tomorrow Evening': SendLaterDates.TomorrowEvening,
  'This Weekend': SendLaterDates.ThisWeekend,
  'Next Week': SendLaterDates.NextWeek,
}

class SendLaterButton extends Component {
  static displayName = 'SendLaterButton';

  static propTypes = {
    draftClientId: PropTypes.string,
  };

  onSendLater = (delayFunc)=> {
    SendLaterActions.sendLater(this.props.draftClientId, delayFunc())
  };

  renderOptions() {
    const elements = []
    for (const key in SendLaterOptions) {
      const delayFunc = SendLaterOptions[key]
      elements.push(
        <div
          key={key}
          onMouseDown={this.onSendLater.bind(this, delayFunc)}
          className="send-later-option">{key}</div>
      );
    }
    return elements;
  }

  render() {
    const button = (
      <button className="btn btn-primary send-later-button">Send Later</button>
    )

    return (
      <Popover
        style={{order: -103}}
        className="send-later"
        buttonComponent={button}>
        <div className="send-later-container">
          {this.renderOptions()}
        </div>
      </Popover>
    );
  }

}

export default SendLaterButton
