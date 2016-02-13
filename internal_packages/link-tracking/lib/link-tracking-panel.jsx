import {Utils, React} from 'nylas-exports'
import {RetinaImg} from 'nylas-component-kit'
import plugin from '../package.json'

export default class LinkTrackingPanel extends React.Component {

  static displayName = 'LinkTrackingPanel';

  constructor(props) {
    super(props);
    this.state = this._getStateFromMessage(props.message)
  }

  componentWillReceiveProps(newProps) {
    this.setState(this._getStateFromMessage(newProps.message));
  }

  _getStateFromMessage(message){
    let metadata = message.metadataForPluginId(plugin.appId);
    if(metadata)
      return {links: Object.keys(metadata.links).map(k=>metadata.links[k])};
    return {};
  };

  render() {
    if(this.state.links)
      return <div className="link-tracking-panel">
        <h4>Link Tracking Enabled</h4>
        <table>
          <tbody>
            {this._renderContents()}
          </tbody>
        </table>
      </div>;
    else
      return <div></div>;
  }

  /*
  <thead><tr>
   <th>Link</th><th>Click count</th>
  </tr></thead>
   */

  _renderContents() {
    return this.state.links.map((link)=>{
      return <tr className="link-info">
        <td className="link-url">{link.url}</td>
        <td className="link-count">{link.click_count+" clicks"}</td>
      </tr>
    })
  };
}
