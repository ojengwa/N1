import {Utils, React} from 'nylas-exports'
import {RetinaImg} from 'nylas-component-kit'
import plugin from '../package.json'

export default class OpenTrackingIcon extends React.Component {

  static displayName = 'OpenTrackingIcon';

  constructor(props) {
    super(props);
    this.state = this._getStateFromThread(props.thread)
  }

  componentWillReceiveProps(newProps) {
    this.setState(this._getStateFromThread(newProps.thread));
  }

  _getStateFromThread(thread){
    let metadatas = thread.metadata.map(m=>m.metadataForPluginId(plugin.appId)).filter(m=>m);
    return {opened: metadatas.length ? metadatas.every(m=>m.open_count>0) : null};
  };

  render() {
    return <div className="open-tracking-icon">
      {this._renderIcon()}
    </div>
  }

  _renderIcon = () => {
    openedIcon = <RetinaImg
        url="nylas://open-tracking/assets/envelope-open-icon@2x.png"
        mode={RetinaImg.Mode.ContentIsMask}
      />;
    unopenedIcon = <RetinaImg
        className="unopened"
        url="nylas://open-tracking/assets/envelope-closed-icon@2x.png"
        mode={RetinaImg.Mode.ContentIsMask}
      />;
    //"●" : "◌"
    return this.state.opened==null ? "" : (this.state.opened ? openedIcon : unopenedIcon);
  };

}
