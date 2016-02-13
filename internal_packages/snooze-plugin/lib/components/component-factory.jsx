/** @babel */
import React, {Component, PropTypes} from 'react';
import {RetinaImg} from 'nylas-component-kit';


const toolbarButton = (
  <button
    className="btn btn-toolbar btn-snooze"
    style={{order: -107}}
    title="Snooze">
    <RetinaImg
      url="nylas://snooze-plugin/assets/ic-toolbar-native-snooze@2x.png"
      mode={RetinaImg.Mode.ContentIsMask} />
  </button>
)

const quickActionButton = (
  <div title="Snooze" className="btn action action-snooze" />
)

export function BulkThreadComponent(ComponentClass, name = '') {
  return class extends Component {
    static displayName = `BulkThread-${Component.name}-${name}`;

    static propTypes = {
      selection: PropTypes.object,
      items: PropTypes.array,
    };

    render() {
      return <ComponentClass buttonComponent={toolbarButton} threads={this.props.items} />;
    }
  };
}

export function ToolbarComponent(ComponentClass, name = '') {
  return class extends Component {
    static displayName = `SingleAction-${Component.name}-${name}`;

    static propTypes = {
      thread: PropTypes.object,
    };

    render() {
      return <ComponentClass buttonComponent={toolbarButton} threads={[this.props.thread]} />;
    }
  };
}

export function QuickActionComponent(ComponentClass, name = '') {
  return class extends Component {
    static displayName = `QuickAction-${Component.name}-${name}`;

    static propTypes = {
      thread: PropTypes.object,
    };

    render() {
      return <ComponentClass buttonComponent={quickActionButton} threads={[this.props.thread]} />;
    }
  };
}
