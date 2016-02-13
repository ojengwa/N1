import {ComponentRegistry, DatabaseStore, Thread, ExtensionRegistry, ComposerExtension, React, Actions, QuotedHTMLTransformer} from 'nylas-exports';
import LinkTrackingButton from './link-tracking-button';
import LinkTrackingIcon from './link-tracking-message-icon';
import LinkTrackingPanel from './link-tracking-panel';
import plugin from '../package.json'

import request from 'request';
import uuid from 'node-uuid';
const post = Promise.promisify(request.post, {multiArgs: true});
const PLUGIN_ID = plugin.appId;
const PLUGIN_URL="n1-link-tracking.herokuapp.com";

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

    //update metadata against the message
    for(const linkId of Object.keys(metadata.links)) {
      metadata.links[linkId].click_count = 0;
      metadata.links[linkId].click_data = [];
    }
    Actions.setMetadata(message, PLUGIN_ID, metadata);

    //post the uid and message id pair to the plugin server
    let data = {uid: uid, message_id:message.id};
    let serverUrl = `http://${PLUGIN_URL}/register-message`;
    return post({
      url: serverUrl,
      body: JSON.stringify(data)
    }).then(args => {
      if(args[0].statusCode != 200)
        throw new Error();
      return args[1];
    }).catch(error => {
      NylasEnv.showErrorDialog("There was a problem contacting the Link Tracking server! This message will not have link tracking");
      Promise.reject(error);
    });
  }
}

class LinkTrackingComposerExtension extends ComposerExtension {
  static finalizeSessionBeforeSending({session}) {
    const draft = session.draft();

    //grab message metadata, if any
    const metadata = draft.metadataForPluginId(PLUGIN_ID);
    if(metadata) {
      let draftBody = new DraftBody(draft);
      let links = {};
      let message_uid = uuid.v4().replace(/-/g,"");

      //loop through all <a href> elements, replace with redirect links and save mappings
      draftBody.unquoted = draftBody.unquoted.replace(/(<a .*?href=")(.*?)(".*?>)/g, (match, prefix, url, suffix, offset) => {
        //generate a UID
        let uid = uuid.v4().replace(/-/g,"");
        let encoded = encodeURIComponent(url);
        let redirectUrl = `http://${PLUGIN_URL}/${draft.accountId}/${message_uid}/${uid}?redirect=${encoded}`;
        links[uid] = {url:url};
        return prefix+redirectUrl+suffix;
      });

      //save the draft
      session.changes.add({body: draftBody.body});
      session.changes.commit();

      //save the link info to draft metadata
      metadata.uid = message_uid;
      metadata.links = links;
      Actions.setMetadata(draft, PLUGIN_ID, metadata);
    }
  }
}

export function activate() {
  ComponentRegistry.register(LinkTrackingButton, {role: 'Composer:ActionButton'});
  ComponentRegistry.register(LinkTrackingIcon, {role: 'ThreadListIcon'});
  ComponentRegistry.register(LinkTrackingPanel, {role: 'message:BodyHeader'});
  ExtensionRegistry.Composer.register(LinkTrackingComposerExtension);
  this._unlistenSendDraftSuccess = Actions.sendDraftSuccess.listen(afterDraftSend);
}

export function serialize() {}

export function deactivate() {
  ComponentRegistry.unregister(LinkTrackingButton);
  ComponentRegistry.unregister(LinkTrackingIcon);
  ComponentRegistry.unregister(LinkTrackingPanel);
  ExtensionRegistry.Composer.unregister(LinkTrackingComposerExtension);
  this._unlistenSendDraftSuccess()
}