/** @babel */
import _ from 'underscore';
import _str from 'underscore.string';
import React, {Component, PropTypes} from 'react';
import {Popover, RetinaImg} from 'nylas-component-kit';
import SnoozeActions from '../snooze-actions'
import * as SnoozeDelays from '../utils/snooze-delays'


class SnoozePopover extends Component {
  static displayName = 'SnoozePopover';

  static propTypes = {
    threads: PropTypes.array.isRequired,
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
    const button = (
      <button
        className="btn btn-toolbar btn-snooze"
        style={{order: -107}}
        title="Snooze">
        <RetinaImg
          url="nylas://N1-Snooze/assets/toolbar-snooze@2x.png"
          mode={RetinaImg.Mode.ContentIsMask} />
      </button>
    );
    const snoozeDelays = _.values(SnoozeDelays);
    const items = snoozeDelays.map(this.renderItem)

    return (
      <Popover
        style={{order: -103}}
        className="SnoozePopover"
        direction="down-align-left"
        buttonComponent={button}>
        <div className="snooze-container">
          {items}
        </div>
      </Popover>
    );
  }

}

export default SnoozePopover;
