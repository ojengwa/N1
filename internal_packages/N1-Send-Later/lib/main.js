/** @babel */
import {ComponentRegistry} from 'nylas-exports'
import SendLaterPopover from './send-later-popover'
import SendLaterStore from './send-later-store'
import SendLaterState from './send-later-state'

export function activate() {
  ComponentRegistry.register(SendLaterPopover, {role: 'Composer:ActionButton'})
  ComponentRegistry.register(SendLaterState, {role: 'DraftList:DraftState'})
  this.sendLaterStore = new SendLaterStore()
}

export function deactivate() {
  ComponentRegistry.unregister(SendLaterPopover)
  ComponentRegistry.unregister(SendLaterState)
}

export function serialize() {

}

