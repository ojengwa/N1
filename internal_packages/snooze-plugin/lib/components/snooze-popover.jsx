/** @babel */
import _ from 'underscore';
import _str from 'underscore.string';
import React, {Component, PropTypes} from 'react';
import {Popover} from 'nylas-component-kit';
import SnoozeActions from '../snooze-actions'
import * as SnoozeDelays from '../utils/snooze-delays'


class SnoozePopover extends Component {
  static displayName = 'SnoozePopover';

  static propTypes = {
    threads: PropTypes.array.isRequired,
    buttonComponent: PropTypes.object.isRequired,
  };

  onSnooze(snoozeDate) {
    SnoozeActions.snoozeThreads(this.props.threads, snoozeDate())
  }

  renderItem = (delayFunc)=> {
    const name = _str.humanize(delayFunc.name)
    return (
      <div
        key={name}
        className="snooze-item"
        onMouseDown={this.onSnooze.bind(this, delayFunc)}>
        {name}
      </div>
    )
  };

  render() {
    const {buttonComponent} = this.props
    const snoozeDelays = _.values(SnoozeDelays);
    const items = snoozeDelays.map(this.renderItem)

    return (
      <Popover
        style={{order: -103}}
        className="snooze-popover"
        direction="down-align-left"
        buttonComponent={buttonComponent}>
        <div className="snooze-container">
          {items}
        </div>
      </Popover>
    );
  }

}

export default SnoozePopover;
