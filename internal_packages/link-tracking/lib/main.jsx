import {ComponentRegistry, DatabaseStore, Thread, ExtensionRegistry, ComposerExtension, React, Actions} from 'nylas-exports';
import LinkTrackingButton from './link-tracking-button';
import LinkTrackingSidebar from './link-tracking-sidebar';
import LinkTrackingIcon from './link-tracking-message-icon';

import request from 'request';
import uuid from 'node-uuid';
const _post = Promise.promisify(request.post, {multiArgs: true});
const _get = Promise.promisify(request.get, {multiArgs: true});


function metadataComponent(ComponentClass, cloudStorage) {
  return class extends React.Component {
    static displayName = ComponentClass.displayName;
    render() {
      return <ComponentClass {...this.props} cloudStorage={cloudStorage} />
    }
  }
}

class DraftBody {
  constructor(draft) {this._body = draft.body}
  get unquoted() {QuotedHTMLTransformer.removeQuotedHTML(this._body);}
  set unquoted(text) {this._body = QuotedHTMLTransformer.appendQuotedHTML(fn(text), body);}
  get body() {return this._body}
  set body(body) {this._body = body}
}

export function activate(localState = {}, cloudStorage = {}) {
  this.BoundLinkTrackingButton = metadataComponent(LinkTrackingButton,cloudStorage);
  this.BoundLinkTrackingIcon = metadataComponent(LinkTrackingIcon,cloudStorage);
  //this.BoundLinkTrackingSidebar = metadataComponent(LinkTrackingSidebar,cloudStorage);
  ComponentRegistry.register(this.BoundLinkTrackingButton, {role: 'Composer:ActionButton'});
  //ComponentRegistry.register(this.BoundLinkTrackingSidebar, {role: 'MessageListSidebar:ContactCard'});
  ComponentRegistry.register(this.BoundLinkTrackingIcon, {role: 'ThreadListIcon'});

  this.LinkTrackingComposerExtension = class extends ComposerExtension {
    finalizeSessionBeforeSending({session}) {
      const draft = session.draft();

      //grab message metadata, if any
      return cloudStorage.getMetadata({objects:[draft]}).then(([metadata]) => {

        const value = metadata ? metadata.value : null;

        //only take action if there's metadata
        if(value) {

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
          value.uid = uid_message_uid;
          value.links = links;
          return cloudStorage.associateMetadata({
            objects: [draft],
            data: value
          });
        }
        else
          Promise.resolve();
      });
    }
  };
  ExtensionRegistry.Composer.register(this.LinkTrackingComposerExtension);

  this.afterDraftSend = function ({draft:message}) {
    //grab message metadata, if any
    cloudStorage.getMetadata({objects:[message]}).then(([metadata]) => {

      const value = metadata ? metadata.value : null;

      //get the uid from the metadata, if present
      if(!value) return Promise.resolve();
      let uid = value.uid;

      //set metadata against thread for fast lookup
      DatabaseStore.findAll(Thread, {threadId: [message.threadId]}).then(([thread]) => {
        return cloudStorage.associateMetadata({
          objects: [thread],
          data: {tracked: true}
        });
      });

      //update metadata against the message
      for(const link of value.links) {
        link.click_count = 0;
        link.click_data = [];
      }
      cloudStorage.associateMetadata({
        objects: [message],
        data: value
      });

      //post the uid and message id pair to the plugin server
      let data = {uid: uid, message_id:message.id};
      let serverUrl = `http://${PLUGIN_URL}/register-message`;
      _get({
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
    });
  }
  this._unlistenSendDraftSuccess = Actions.sendDraftSuccess.listen(this.afterDraftSend);
}

export function serialize() {}

export function deactivate() {
  ComponentRegistry.unregister(this.BoundLinkTrackingButton);
  //ComponentRegistry.unregister(this.BoundLinkTrackingSidebar);
  ComponentRegistry.unregister(this.BoundLinkTrackingIcon);
  ExtensionRegistry.Composer.unregister(this.LinkTrackingComposerExtension);
  this._unlistenSendDraftSuccess()
}