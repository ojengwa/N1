import {Utils, React, DraftStore} from 'nylas-exports'
import {RetinaImg} from 'nylas-component-kit'

export default class OpenTrackingSidebar extends React.Component {

  static displayName = 'OpenTrackingSidebar';

  static propTypes = {
    cloudStorage: React.PropTypes.object,
  };

  constructor(props) {
    super(props);
    this.state = {};
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

  render() {
    return ""
  }

  //set an observer on the object's metadata
  _setMetadataObserver(props) {

      //trigger a change on the associated metadata
      props.cloudStorage.getMetadata({objects:[props.thread]}).then(this._onMetadataChange);

      //if we already had subscribed to something, unsubscribe first
      if(this._observerSubscription) this._observerSubscription.dispose();

      //now subscribe to the new metadata
      this._observerSubscription = props.cloudStorage
        .observeMetadata({objects:[draft]})
        .subscribe(this._onMetadataChange)
  }

  _onMetadataChange=([metadata])=> {

  };

}