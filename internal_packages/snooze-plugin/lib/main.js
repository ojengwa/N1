/** @babel */
import {ComponentRegistry} from 'nylas-exports';
import {ToolbarComponent, QuickActionComponent, BulkThreadComponent} from './components/component-factory';
import SnoozePopover from './components/snooze-popover';
import SnoozeStore from './snooze-store'


export function activate() {
  this.toolbarComp = ToolbarComponent(SnoozePopover, 'message:Toolbar');
  this.quickComp = QuickActionComponent(SnoozePopover, 'ThreadListQuickAction');
  this.bulkComp = BulkThreadComponent(SnoozePopover, 'thread:BuilkAction');

  ComponentRegistry.register(this.toolbarComp, {role: 'message:Toolbar'});
  ComponentRegistry.register(this.quickComp, {role: 'ThreadListQuickAction'});
  ComponentRegistry.register(this.bulkComp, {role: 'thread:BulkAction'});

  this.snoozeStore = new SnoozeStore()
}

export function deactivate() {
  ComponentRegistry.unregister(this.toolbarComp);
  ComponentRegistry.unregister(this.quickComp);
  ComponentRegistry.unregister(this.bulkComp);
}

export function serialize() {

}
