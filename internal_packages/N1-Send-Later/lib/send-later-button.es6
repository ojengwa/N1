import {React, Thread, DatabaseStore} from 'nylas-exports'
import {RetinaImg} from 'nylas-component-kit'

export default class SendLaterButton extends React.Component {

  static displayName = "SendLaterButton"

  static propTypes = {
    threadId: React.PropTypes.string,
    cloudStorage: React.PropTypes.object,
  }

  constructor(props) {
    super(props)
    this.state = {sendTime: null}
  }

  componentWillMount() {
    this._initializeState(this.props)
  }

  componentWillReceiveProps(newProps) {
    this._initializeState(newProps)
  }

  componentWillUnmount() {
    if (this._subscription) { this._subscription.dispose() }
  }

  _initializeState(props) {
    if (!props.threadId) {return;}
    DatabaseStore.find(Thread, props.threadId).then((thread) => {
      this.thread = thread

      props.cloudStorage.getMetadata({objects: [this.thread]})
      .then(this._onChange)

      if (this._subscription) { this._subscription.dispose() }
      this._subscription = props.cloudStorage
      .observeMetadata({objects: [this.thread]})
      .subscribe(this._onChange);
    })
  }

  _onChange = (metadatum) => {
    let newValue = null;
    if (metadatum) {
      // When we "unset" our metadata, we set the value to `null`
      newValue = metadatum.value
    }
    this.setState({sendTime: newValue})
  }

  _onSet = () => {
    if (!this.thread) {return;}

    // TODO FIXME: Actually implement!
    const newTime = Date.now()

    this.props.cloudStorage.associateMetadata({
      objects: [this.thread],
      data: newTime,
    })
  }

  _onClear() {
    if (!this.thread) {return;}
    this.props.cloudStorage.associateMetadata({
      objects: [this.thread],
      data: null,
    })
  }

  render() {
    const url = "nylas://N1-Send-Later/assets/send-later-icon@2x.png"
    return (
      <div>
        <button className="btn btn-toolbar" onClick={this._onSet} title="QuickSchedule">
          <RetinaImg url={url} mode={RetinaImg.Mode.ContentIsMask} />
        </button>
        <button onClick={this._onClear}>clear</button>
      </div>
    )
  }
}
