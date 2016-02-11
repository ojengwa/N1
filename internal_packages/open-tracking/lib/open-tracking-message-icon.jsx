import {Utils, React} from 'nylas-exports'
import {RetinaImg} from 'nylas-component-kit'
import plugin from '../package.json'

export default class OpenTrackingIcon extends React.Component {

  static displayName = 'OpenTrackingIcon';

  constructor(props) {
    super(props);
    let metadata = props.thread.metadataForPluginId(plugin.appId);
    this.state = {opened: metadata ? metadata.opened : null};
  }

  componentWillReceiveProps(newProps) {
    let metadata = newProps.thread.metadataForPluginId(plugin.appId);
    this.setState({opened: metadata ? metadata.opened : null});
  }

  render() {
    return <div className="open-tracking-icon">
      {this._renderIcon()}
    </div>
  }

  _renderIcon = () => {
    openedIcon = <RetinaImg url="nylas://open-tracking/assets/envelope-open-icon@2x.png"
                            mode={RetinaImg.Mode.ContentIsMask} />;
    unopenedIcon = <RetinaImg url="nylas://open-tracking/assets/envelope-closed-icon@2x.png"
                              mode={RetinaImg.Mode.ContentIsMask} />;
    //"●" : "◌"
    return this.state.opened==null ? "" : (this.state.opened ? openedIcon : unopenedIcon);
  };

}
