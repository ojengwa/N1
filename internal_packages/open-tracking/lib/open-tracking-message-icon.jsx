import {Utils, React} from 'nylas-exports'
import {RetinaImg} from 'nylas-component-kit'

export default class OpenTrackingIcon extends React.Component {

  static displayName = 'OpenTrackingIcon';

  constructor(props) {
    super(props);
    this.state = {opened: null};
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

  _onMetadataChange=([metadata])=> {
    this.setState({opened: metadata ? metadata.value.open_count : null});
  };
}
