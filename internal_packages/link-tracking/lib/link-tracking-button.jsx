import {Utils, DraftStore, React} from 'nylas-exports'
import {RetinaImg} from 'nylas-component-kit'

export default class LinkTrackingButton extends React.Component {

  static displayName = 'LinkTrackingButton';

  static propTypes = {
    cloudStorage: React.PropTypes.object,
    draftClientId: React.PropTypes.string.isRequired
  };

  constructor(props) {
    super(props);
    this.state = {enabled: false};
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
    return <button className={`btn btn-toolbar ${this.state.enabled ? "btn-action" : ""}`}
                   onClick={this._onClick} title="Link Tracking">
      <RetinaImg url="nylas://link-tracking/assets/linktracking-icon@2x.png"
                 mode={RetinaImg.Mode.ContentIsMask} />
    </button>
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

  _onClick=()=> {
    let currentlyEnabled = this.state.enabled;

    //trigger an immediate change for better UI
    this.setState({enabled: !currentlyEnabled});

    //write metadata into the draft to indicate tracked state
    DraftStore.sessionForClientId(this.props.draftClientId).then(session => {
      let draft = session.draft();
      this.props.cloudStorage.associateMetadata({
        objects:[draft],
        data:(currentlyEnabled ? null : {tracked:true})
      })
    });
  };

  _onMetadataChange=(metadata)=> {
    this.setState({enabled: metadata ? metadata.value : false})
  };
}

