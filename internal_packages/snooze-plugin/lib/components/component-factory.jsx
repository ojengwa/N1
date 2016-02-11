/** @babel */
import React, {Component, PropTypes} from 'react';

export function BulkActionComponent(ComponentClass, name = '') {
  return class extends Component {
    static displayName = `BulkAction-${Component.name}-${name}`;

    static propTypes = {
      selection: PropTypes.object,
      items: PropTypes.array,
    };

    render() {
      return <ComponentClass threads={this.props.items} />;
    }
  };
}

export function SingleActionComponent(ComponentClass, name = '') {
  return class extends Component {
    static displayName = `SingleAction-${Component.name}-${name}`;

    static propTypes = {
      thread: PropTypes.object,
    };

    render() {
      return <ComponentClass threads={[this.props.thread]} />;
    }
  };
}
