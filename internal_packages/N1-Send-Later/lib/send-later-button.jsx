/** @babel */
import _ from 'underscore'
import React, {Component, PropTypes} from 'react'
import {DateUtils} from 'nylas-exports'
import {Popover} from 'nylas-component-kit'
import SendLaterActions from './send-later-actions'


const DATE_FORMAT_LONG = 'ddd, MMM D, YYYY h:mmA'
const DATE_FORMAT_SHORT = 'MMM D h:mmA'

const SendLaterOptions = {
  'In 1 hour': DateUtils.in1Hour,
  'In 2 hours': DateUtils.in2Hours,
  'In 4 hours': DateUtils.in4Hours,
  'Tomorrow Morning': DateUtils.tomorrowMorning,
  'Tomorrow Evening': DateUtils.tomorrowEvening,
  'This Weekend': DateUtils.thisWeekend,
  'Next Week': DateUtils.nextWeek,
}

class SendLaterButton extends Component {
  static displayName = 'SendLaterButton';

  static propTypes = {
    draftClientId: PropTypes.string,
  };

  constructor() {
    super()
    this.state = {
      sendDate: null,
    }
  }

  onSendLater = (momentDate)=> {
    const utcDate = momentDate.utc()
    const formatted = DateUtils.format(utcDate)
    SendLaterActions.sendLater(this.props.draftClientId, formatted)
    this.setState({sendDate: null})
    this.refs.popover.close()
  };

  onInputChange = (event)=> {
    this.updateInputSendDateValue(event.target.value)
  };

  updateInputSendDateValue = _.debounce((dateValue)=> {
    const sendDate = DateUtils.fromString(dateValue)
    this.setState({sendDate})
  }, 250);

  renderItems() {
    return Object.keys(SendLaterOptions).map((label)=> {
      const date = SendLaterOptions[label]()
      const dateString = DateUtils.format(date, DATE_FORMAT_SHORT)
      return (
        <div
          key={label}
          onMouseDown={this.onSendLater.bind(this, date)}
          className="send-later-option">
          {label}
          <em className="item-date-value">{dateString}</em>
        </div>
      );
    })
  }

  renderInput() {
    const {sendDate} = this.state
    let dateString;
    if (sendDate) {
      dateString = DateUtils.format(sendDate, DATE_FORMAT_LONG)
    }
    return (
      <div className="send-later-input">
        <label>At a specific time</label>
        <input
          type="text"
          placeholder="e.g. Next Monday at 1pm"
          onChange={this.onInputChange}/>
        {dateString ?
          <em className="input-date-value">{dateString}</em> :
          void 0}
        {dateString ?
          <button
            className="btn btn-schedule"
            onMouseDown={this.onSendLater.bind(this, sendDate)}>Schedule Email</button> :
          void 0}
      </div>
    )
  }

  render() {
    const button = (
      <button className="btn btn-primary send-later-button">Send Later</button>
    )

    return (
      <Popover
        ref="popover"
        style={{order: -103}}
        className="send-later"
        buttonComponent={button}>
        <div className="send-later-container">
          {this.renderItems()}
          <div className="divider" />
          {this.renderInput()}
        </div>
      </Popover>
    );
  }

}

export default SendLaterButton
