/** @babel */
import _ from 'underscore'
import React, {Component, PropTypes} from 'react'
import {DateUtils} from 'nylas-exports'
import {Popover} from 'nylas-component-kit'
import SendLaterActions from './send-later-actions'
import SendLaterStore from './send-later-store'
import {DATE_FORMAT_SHORT, DATE_FORMAT_LONG, PLUGIN_ID} from './send-later-constants'


const SendLaterOptions = {
  'In 1 hour': DateUtils.in1Hour,
  'In 2 hours': DateUtils.in2Hours,
  'In 4 hours': DateUtils.in4Hours,
  'Tomorrow Morning': DateUtils.tomorrowMorning,
  'Tomorrow Evening': DateUtils.tomorrowEvening,
  'This Weekend': DateUtils.thisWeekend,
  'Next Week': DateUtils.nextWeek,
}

class SendLaterPopover extends Component {
  static displayName = 'SendLaterPopover';

  static propTypes = {
    draftClientId: PropTypes.string,
  };

  constructor(props) {
    super(props)
    const isScheduled = this.isScheduled()
    this.state = {
      inputSendDate: null,
      isScheduled,
      buttonLabel: this.getButtonLabel(isScheduled),
    }
  }

  componentDidMount() {
    this.unsubscribe = SendLaterStore.listen(this.onScheduledMessagesChanged)
  }

  componentWillUnmount() {
    this.unsubscribe()
  }

  onSendLater = (momentDate)=> {
    const utcDate = momentDate.utc()
    const formatted = DateUtils.format(utcDate)
    SendLaterActions.sendLater(this.props.draftClientId, formatted)

    this.setState({buttonLabel: "Scheduling...", inputSendDate: null})
    this.refs.popover.close()
  };

  onCancelSendLater = ()=> {
    SendLaterActions.cancelSendLater(this.props.draftClientId)
    this.setState({inputSendDate: null})
    this.refs.popover.close()
  };

  onScheduledMessagesChanged = ()=> {
    const isScheduled = this.isScheduled()
    const buttonLabel = this.getButtonLabel(isScheduled)
    if (buttonLabel !== this.state.buttonLabel) {
      this.setState({isScheduled, buttonLabel})
    }
  };

  onInputChange = (event)=> {
    this.updateInputSendDateValue(event.target.value)
  };

  getButtonLabel = (isScheduled)=> {
    return isScheduled ? '✅  Scheduled' : 'Send Later';
  };

  isScheduled = ()=> {
    const msg = SendLaterStore.getScheduledMessage(this.props.draftClientId)
    if (msg && msg.metadataForPluginId(PLUGIN_ID).sendLaterDate) {
      return true
    }
    return false
  };

  updateInputSendDateValue = _.debounce((dateValue)=> {
    const inputSendDate = DateUtils.fromString(dateValue)
    this.setState({inputSendDate})
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

  renderInput(inputSendDate) {
    let dateString;
    if (inputSendDate) {
      dateString = DateUtils.format(inputSendDate, DATE_FORMAT_LONG)
    }
    return (
      <div className="send-later-section">
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
            className="btn btn-send-later"
            onMouseDown={this.onSendLater.bind(this, inputSendDate)}>Schedule Email</button> :
          void 0}
      </div>
    )
  }

  render() {
    const {isScheduled, buttonLabel, inputSendDate} = this.state
    const button = (
      <button className="btn btn-primary send-later-button">{buttonLabel}</button>
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
          {this.renderInput(inputSendDate)}
          {isScheduled ?
            <div className="divider" />
          : void 0}
          {isScheduled ?
            <div className="send-later-section">
              <button className="btn btn-send-later" onMouseDown={this.onCancelSendLater}>
                Cancel Send Later
              </button>
            </div>
          : void 0}
        </div>
      </Popover>
    );
  }

}

export default SendLaterPopover
