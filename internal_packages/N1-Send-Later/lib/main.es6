import SendLaterButton from './send-later-button.es6'
import {React, ComponentRegistry} from 'nylas-exports'

class BoundComponent extends React.Component {
  static displayName = "SendLaterButton"
}

export function activate(localState = {}, cloudStorage = {}) {
  // Must be bound to the component, not `this`
  BoundComponent.prototype.render = function render() {
    return (
      <SendLaterButton {...this.props} cloudStorage={cloudStorage}/>
    )
  }

  ComponentRegistry.register(BoundComponent,
                             {role: 'Composer:ActionButton'})
}

export function deactivate() {
  ComponentRegistry.unregister(BoundComponent)
}

export function serialize() {

}
