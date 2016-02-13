import {ComponentRegistry, ExtensionRegistry, DatabaseStore, Thread, ComposerExtension, React, Actions, QuotedHTMLTransformer} from 'nylas-exports';
import OpenTrackingButton from './open-tracking-button';
import OpenTrackingIcon from './open-tracking-message-icon';
import plugin from '../package.json'

import request from 'request';
import uuid from 'node-uuid';
const post = Promise.promisify(request.post, {multiArgs: true});
const PLUGIN_ID = plugin.appId;
const PLUGIN_URL="n1-open-tracking.herokuapp.com";

class DraftBody {
  constructor(draft) {this._body = draft.body}
  get unquoted() {return QuotedHTMLTransformer.removeQuotedHTML(this._body);}
  set unquoted(text) {this._body = QuotedHTMLTransformer.appendQuotedHTML(text, this._body);}
  get body() {return this._body}
}

function afterDraftSend({message}) {
  //only run this handler in the main window
  if(!NylasEnv.isMainWindow()) return;

  //grab message metadata, if any
  const metadata = message.metadataForPluginId(PLUGIN_ID);

  //get the uid from the metadata, if present
  if(metadata){
    let uid = metadata.uid;

    //set metadata against the message
    Actions.setMetadata(message, PLUGIN_ID, {open_count: 0, open_data: []});

    //post the uid and message id pair to the plugin server
    let data = {uid: uid, message_id:message.id, thread_id:1};
    let serverUrl = `http://${PLUGIN_URL}/register-message`;
    return post({
      url: serverUrl,
      body: JSON.stringify(data)
    }).then(args => {
      if(args[0].statusCode != 200)
        throw new Error();
      return args[1];
    }).catch(error => {
      NylasEnv.showErrorDialog("There was a problem contacting the Open Tracking server! This message will not have open tracking :(");
      Promise.reject(error);
    });
  }
}

class OpenTrackingComposerExtension extends ComposerExtension {
  static finalizeSessionBeforeSending({session}) {
    const draft = session.draft();

    //grab message metadata, if any
    let metadata = draft.metadataForPluginId(PLUGIN_ID);
    if(metadata) {
      //generate a UID
      let uid = uuid.v4().replace(/-/g,"");

      //insert a tracking pixel <img> into the message
      let serverUrl = `http://${PLUGIN_URL}/${draft.accountId}/${uid}`;
      let img = `<img width="0" height="0" style="border:0; width:0; height:0;" src="${serverUrl}">`;
      let draftBody = new DraftBody(draft);
      draftBody.unquoted = draftBody.unquoted+"<br>"+img;

      //save the draft
      session.changes.add({body: draftBody.body});
      session.changes.commit();

      //save the uid to draft metadata
      metadata.uid = uid;
      Actions.setMetadata(draft, PLUGIN_ID, metadata);
    }
  }
}

export function activate() {
  ComponentRegistry.register(OpenTrackingButton, {role: 'Composer:ActionButton'});
  ComponentRegistry.register(OpenTrackingIcon, {role: 'ThreadListIcon'});
  ExtensionRegistry.Composer.register(OpenTrackingComposerExtension);
  this._unlistenSendDraftSuccess = Actions.sendDraftSuccess.listen(afterDraftSend);
}

export function serialize() {}

export function deactivate() {
  ComponentRegistry.unregister(OpenTrackingButton);
  ComponentRegistry.unregister(OpenTrackingIcon);
  ExtensionRegistry.Composer.unregister(OpenTrackingComposerExtension);
  this._unlistenSendDraftSuccess()
}