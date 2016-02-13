import {Utils, React} from 'nylas-exports'
import {RetinaImg} from 'nylas-component-kit'
import plugin from '../package.json'

export default class LinkTrackingIcon extends React.Component {

  static displayName = 'LinkTrackingIcon';

  constructor(props) {
    super(props);
    this.state = this._getStateFromThread(props.thread)
  }

  componentWillReceiveProps(newProps) {
    this.setState(this._getStateFromThread(newProps.thread));
  }

  _getStateFromThread(thread){
    let metadatas = thread.metadata.map(m=>m.metadataForPluginId(plugin.appId)).filter(m=>m);
    if(metadatas.length) {
      const msgClickMax = (m) => Math.max(...Object.keys(m.links).map(id=>m.links[id].click_count||0));
      return {clicks: Math.max(...metadatas.map(msgClickMax))};
    }
    else
      return {clicks: null};
  };

  render() {
    return <div className="link-tracking-icon">
      {this._renderIcon()}
    </div>
  }

  _renderIcon = () => {
    return this.state.clicks==null ? "" : this._getIcon(this.state.clicks);
  };

  _getIcon(clicks) {
    return <span>
      <RetinaImg
        className={clicks>0 ? "clicked" : ""}
        url="nylas://link-tracking/assets/linktracking-icon@2x.png"
        mode={RetinaImg.Mode.ContentIsMask} />
      <span className="link-click-count">{clicks>0 ? clicks : ""}</span>
    </span>
  }
}
