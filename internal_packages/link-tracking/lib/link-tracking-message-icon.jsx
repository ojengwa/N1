import {Utils, React} from 'nylas-exports'
import {RetinaImg} from 'nylas-component-kit'

export default class LinkTrackingIcon extends React.Component {

  static displayName = 'LinkTrackingIcon';

  constructor(props) {
    super(props);
    this.state = {tracked: false};
    this._observerSubscription = null;
  }

  componentWillMount() {
    this._setMetadataObserver(this.props)
  }

  componentWillReceiveProps(newProps) {
    this._setMetadataObserver(newProps)
  }

  componentWillUnmount() {
    if(this._observerSubscription) this._observerSubscription.dispose();
  }

  _setMetadataObserver(props) {
    //trigger a change on the accociated metadata
    props.cloudStorage.getMetadata({objects:[props.thread]}).then(this._onMetadataChange);

    //if we already had subscribed to something, unsubscribe first
    if(this._observerSubscription) this._observerSubscription.dispose();

    //now subscribe to the new metadata
    this._observerSubscription = props.cloudStorage
      .observeMetadata({objects:[props.thread]})
      .subscribe(this._onMetadataChange)
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

  _onMetadataChange=([metadata])=> {
    this.setState({tracked: metadata ? true : false});
  };
}
