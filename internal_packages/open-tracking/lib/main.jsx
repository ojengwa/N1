import {ComponentRegistry, ExtensionRegistry, DatabaseStore, Thread, ComposerExtension, React, Actions} from 'nylas-exports';
import OpenTrackingButton from './open-tracking-button';
import OpenTrackingSidebar from './open-tracking-sidebar';
import OpenTrackingIcon from './open-tracking-message-icon';

import request from 'request';
import uuid from 'node-uuid';
post = Promise.promisify(request.post, {multiArgs: true});


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
  this.BoundOpenTrackingIcon = metadataComponent(OpenTrackingIcon,cloudStorage);
  this.BoundOpenTrackingButton = metadataComponent(OpenTrackingButton,cloudStorage);
  //this.BoundOpenTrackingSidebar = metadataComponent(OpenTrackingSidebar,cloudStorage);
  ComponentRegistry.register(this.BoundOpenTrackingButton, {role: 'Composer:ActionButton'});
  //ComponentRegistry.register(this.BoundOpenTrackingSidebar, {role: 'MessageListSidebar:ContactCard'});
  ComponentRegistry.register(this.BoundOpenTrackingIcon, {role: 'ThreadListIcon'});

  this.OpenTrackingComposerExtension = class extends ComposerExtension {
    finalizeSessionBeforeSending({session}) {
      const draft = session.draft();

      //grab message metadata, if any
      return cloudStorage.getMetadata({objects:[draft]}).then(([metadata]) => {

        const value = metadata ? metadata.value : null;

        //only take action if there's metadata
        if(value) {

          //generate a UID
          let uid = uuid.v4();

          //save the uid to draft metadata
          value.uid = uid;
          return cloudStorage.associateMetadata({
            objects: [draft],
            data: value
          }).then(() => {

            //insert a tracking pixel <img> into the message
            let serverUrl = `http://${PLUGIN_URL}/${accountId}/${uid}"`;
            let img = `<img width="0" height="0" style="border:0; width:0; height:0;" src="${serverUrl}">`;
            draftBody = new DraftBody(draft);
            draftBody.unquoted = draftBody.unquoted+"<br>"+img;
            session.changes.add({body: draftBody.body});
            session.changes.commit();
          });
        }
        else
          Promise.resolve();
      });
    }
  };

  ExtensionRegistry.Composer.register(this.OpenTrackingComposerExtension);


  this.afterDraftSend = function({draft:message}) {
    //grab message metadata, if any
    cloudStorage.getMetadata({objects:[message]}).then(([metadata]) => {
      const value = metadata ? metadata.value : null;

      //get the uid from the metadata, if present
      if(!value) return Promise.resolve();
      let uid = value.uid;

      //set metadata against thread for fast lookup
      DatabaseStore.findAll(Thread, {threadId: [message.threadId]}).then(([thread]) => {
        cloudStorage.associateMetadata({
          objects: [message.thread],
          data: {tracked: true}
        });
      });

      //set metadata against the message
      cloudStorage.associateMetadata({
        objects: [message],
        data: {open_count: 0, open_data: []}
      });

      //post the uid and message id pair to the plugin server
      let data = {uid: uid, message_id:message.id};
      let serverUrl = `http://${PLUGIN_URL}/register-message`;
      post({
        url: serverUrl,
        body: JSON.stringify(data)
      }).then(args => {
        if(args[0].statusCode != 200)
          throw new Error();
        return args[1];
      }).catch(error => {
        dialog = require('remote').require('dialog');
        dialog.showErrorBox("There was a problem contacting the Open Tracking server! This message will not have open tracking :(");
        Promise.reject(error);
      });
    });
  }
  this._unlistenSendDraftSuccess = Actions.sendDraftSuccess.listen(this.afterDraftSend);
}

export function serialize() {}

export function deactivate() {
  ComponentRegistry.unregister(this.BoundOpenTrackingButton);
  //ComponentRegistry.unregister(this.BoundOpenTrackingSidebar);
  ComponentRegistry.unregister(this.BoundOpenTrackingIcon);
  ExtensionRegistry.Composer.unregister(this.OpenTrackingComposerExtension);
  this._unlistenSendDraftSuccess()
}