import {Utils, React} from 'nylas-exports'
import {RetinaImg} from 'nylas-component-kit'
import plugin from '../package.json'

export default class LinkTrackingIcon extends React.Component {

  static displayName = 'LinkTrackingIcon';

  constructor(props) {
    super(props);
    let metadata = props.thread.metadataForPluginId(plugin.appId);
    this.state = {enabled: metadata ? metadata.tracked : false};
  }

  componentWillReceiveProps(newProps) {
    let metadata = newProps.thread.metadataForPluginId(plugin.appId);
    this.setState({enabled: metadata ? metadata.tracked : false});
  }

  render() {
    return <div className="link-tracking-icon">
      {this._renderIcon()}
    </div>
  }

  _renderIcon = () => {
    linkedIcon = <RetinaImg url="nylas://link-tracking/assets/linktracking-icon@2x.png"
                            mode={RetinaImg.Mode.ContentIsMask} />;
    return this.state.tracked==null ? "" : linkedIcon;
  };
}
