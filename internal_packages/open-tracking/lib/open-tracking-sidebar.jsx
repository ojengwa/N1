import {Utils, React, DraftStore} from 'nylas-exports'
import {RetinaImg} from 'nylas-component-kit'

export default class OpenTrackingSidebar extends React.Component {

  static displayName = 'OpenTrackingSidebar';

  static propTypes = {
    cloudStorage: React.PropTypes.object,
    draftClientId: React.PropTypes.string.isRequired
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

  _setMetadataObserver(props) {
    //look up the draft object
    DraftStore.sessionForClientId(props.draftClientId).then(session => {
      let draft = session.draft();
      //set an observer on the object's metadata

      //trigger a change on the accociated metadata
      props.cloudStorage.getMetadata({objects:[draft]}).then(this._onMetadataChange);

      //if we already had subscribed to something, unsubscribe first
      if(this._observerSubscription) this._observerSubscription.dispose();

      //now subscribe to the new metadata
      this._observerSubscription = props.cloudStorage
        .observeMetadata({objects:[draft]})
        .subscribe(this._onMetadataChange)
    });
  }

  _onMetadataChange=([metadata])=> {

  };

}