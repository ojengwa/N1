import {Utils, DraftStore, React, Actions, NylasAPI, DatabaseStore, Message, Rx} from 'nylas-exports'
import {RetinaImg} from 'nylas-component-kit'
import plugin from '../package.json'
const PLUGIN_ID = plugin.appId;

export default class OpenTrackingButton extends React.Component {

  static displayName = 'OpenTrackingButton';

  static propTypes = {
    cloudStorage: React.PropTypes.object,
    draftClientId: React.PropTypes.string.isRequired
  };

  constructor(props) {
    super(props);
    this.state = {enabled: false};
    this.setStateFromDraftId(props.draftClientId);
  }

  componentWillReceiveProps(newProps) {
    this.setStateFromDraftId(newProps.draftClientId);
  }

  componentDidMount() {
    let query = DatabaseStore.findBy(Message, {clientId: this.props.draftClientId});
    this._subscription = Rx.Observable.fromQuery(query).subscribe(this.setStateFromDraft)
  }
  componentWillUnmount(){
    this._subscription.dispose();
  }

  setStateFromDraft =(draft)=> {
    if(!draft) return;
    let metadata = draft.metadataForPluginId(PLUGIN_ID);
    this.setState({enabled: metadata ? metadata.tracked : false});
  };

  setStateFromDraftId(draftClientId) {
    if(draftClientId)
      DraftStore.sessionForClientId(draftClientId).then(session => {
        this.setStateFromDraft(session.draft());
      });
  }

  render() {
    return <button className={`btn btn-toolbar ${this.state.enabled ? "btn-action" : ""}`}
                   onClick={this._onClick} title="Open Tracking">
      <RetinaImg url="nylas://open-tracking/assets/envelope-open-icon@2x.png"
                 mode={RetinaImg.Mode.ContentIsMask} />
    </button>
  }

  _onClick=()=> {
    let currentlyEnabled = this.state.enabled;

    ////trigger an immediate change for better UI
    //this.setState({enabled: !currentlyEnabled});

    //write metadata into the draft to indicate tracked state
    DraftStore.sessionForClientId(this.props.draftClientId)
      .then(session => session.draft())
      .then(draft => {
        return NylasAPI.authPlugin(PLUGIN_ID, plugin.title, draft.accountId).then(() => {
          Actions.setMetadata(draft, PLUGIN_ID, currentlyEnabled ? null : {tracked:true});
        });
      });
  };
}
