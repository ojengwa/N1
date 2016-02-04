import {Utils, DraftStore, React} from 'nylas-exports'
import {RetinaImg} from 'nylas-component-kit'

export default class OpenTrackingIcon extends React.Component {

  static displayName = 'OpenTrackingIcon';

  constructor(props) {
    super(props);
    //look for metadata in messages, from this.props.thread, or just look at thread metadata?
    metadata = {};
    this.state = metadata!=null ? {tracked: true, opened: metadata.openCount} : {};
  }

  render() {
    return <div className="open-tracking-icon">
      {this._renderIcon()}
    </div>
  }

  _renderIcon = () => {
    return this.state.tracked ? "" : (this.state.opened ? "●" : "◌");
  }
}
