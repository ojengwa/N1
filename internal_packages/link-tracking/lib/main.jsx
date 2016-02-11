import {ComponentRegistry, DatabaseStore, Thread, ExtensionRegistry, ComposerExtension, React, Actions} from 'nylas-exports';
import LinkTrackingButton from './link-tracking-button';
import LinkTrackingIcon from './link-tracking-message-icon';
import plugin from '../package.json'

import request from 'request';
import uuid from 'node-uuid';
const post = Promise.promisify(request.post, {multiArgs: true});
const PLUGIN_ID = plugin.appId;


class DraftBody {
  constructor(draft) {this._body = draft.body}
  get unquoted() {QuotedHTMLTransformer.removeQuotedHTML(this._body);}
  set unquoted(text) {this._body = QuotedHTMLTransformer.appendQuotedHTML(fn(text), body);}
  get body() {return this._body}
  set body(body) {this._body = body}
}

function afterDraftSend({draft}) {
  //grab message metadata, if any
  const metadata = draft.getMetadata(PLUGIN_ID);

  //get the uid from the metadata, if present
  if(metadata){
    let uid = metadata.uid;

    //set metadata against thread for fast lookup
    DatabaseStore.find(Thread, draft.threadId).then((thread) => {
      Actions.setMetadata(thread, PLUGIN_ID, {tracked:true});
    });

    //update metadata against the message
    for(const link of metadata.links) {
      link.click_count = 0;
      link.click_data = [];
    }
    Actions.setMetadata(draft, PLUGIN_ID, metadata);

    //post the uid and message id pair to the plugin server
    let data = {uid: uid, message_id:draft.id};
    let serverUrl = `http://${PLUGIN_URL}/register-message`;
    return post({
      url: serverUrl,
      body: JSON.stringify(data)
    }).then(args => {
      if(args[0].statusCode != 200)
        throw new Error();
      return args[1];
    }).catch(error => {
      const dialog = require('remote').require('dialog');
      dialog.showErrorBox("There was a problem contacting the Link Tracking server! This message will not have link tracking");
      Promise.reject(error);
    });
  }
}

class LinkTrackingComposerExtension extends ComposerExtension {
  finalizeSessionBeforeSending({session}) {
    const draft = session.draft();

    //grab message metadata, if any
    const metadata = draft.getMetadata(PLUGIN_ID);

    //only take action if there's metadata
    if(metadata) {
      let draftBody = new DraftBody(draft);
      let links = {};
      let message_uid = uuid.v4();

      //loop through all <a href> elements, replace with redirect links and save mappings
      draftBody.unquoted = draftBody.unquoted.replace(/(<a .*?href=")(.*?)(".*?>)/g, (match, prefix, url, suffix, offset) => {
        //generate a UID
        let uid = uuid.v4();
        let encoded = encodeURIComponent(url);
        let redirectUrl = `http://${PLUGIN_URL}/${accountId}/${message_uid}/${uid}?redirect=${encoded}"`;
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
  ExtensionRegistry.Composer.register(LinkTrackingComposerExtension);
  this._unlistenSendDraftSuccess = Actions.sendDraftSuccess.listen(afterDraftSend);
}

export function serialize() {}

export function deactivate() {
  ComponentRegistry.unregister(LinkTrackingButton);
  ComponentRegistry.unregister(LinkTrackingIcon);
  ExtensionRegistry.Composer.unregister(LinkTrackingComposerExtension);
  this._unlistenSendDraftSuccess()
}