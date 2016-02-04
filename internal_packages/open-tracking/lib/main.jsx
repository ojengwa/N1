import {ComponentRegistry, ExtensionRegistry, ComposerExtension, React, Actions} from 'nylas-exports';
import OpenTrackingButton from './open-tracking-button';
import OpenTrackingSidebar from './open-tracking-sidebar';
import OpenTrackingIcon from './open-tracking-message-icon';

import request from 'request';
import uuid from 'node-uuid';
post = Promise.promisify(request.post, {multiArgs: true});


function metadataComponent(componentClass, cloudStorage) {
  return class extends React.Component {
    static displayName = componentClass.displayName;
    render() {
      return <componentClass {...this.props} cloudStorage={cloudStorage} />
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

let BoundOpenTrackingIcon;
let BoundOpenTrackingSidebar;
let OpenTrackingComposerExtension;

let _unlistenSendDraftSuccess = null;
function afterDraftSend(message) {
  //grab message metadata, if any
  cloudStorage.getMetadata({objects:[message]}).then((metadata) => {

    //get the uid from the metadata, if present
    if(!metadata) return Promise.resolve();
    let uid = metadata.uid;

    //set metadata against thread for fast lookup
    cloudStorage.associateMetadata({
      objects: [message.thread],
      data: {tracked: true}
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

export function activate(localState = {}, cloudStorage = {}) {
  BoundOpenTrackingIcon = metadataComponent(OpenTrackingIcon,cloudStorage);
  BoundOpenTrackingSidebar = metadataComponent(OpenTrackingSidebar,cloudStorage);
  ComponentRegistry.register(OpenTrackingButton, {role: 'Composer:ActionButton'});
  ComponentRegistry.register(BoundOpenTrackingSidebar, {role: 'MessageListSidebar:ContactCard'});
  ComponentRegistry.register(BoundOpenTrackingIcon, {role: 'ThreadListIcon'});
  _unlistenSendDraftSuccess = Actions.sendDraftSuccess.listen(afterDraftSend);

  OpenTrackingComposerExtension = class extends ComposerExtension {
    finalizeSessionBeforeSending({session}) {
      const draft = session.draft();

      //grab message metadata, if any
      return cloudStorage.getMetadata({objects:[draft]}).then((metadata) => {

        //only take action if there's metadata
        if(metadata) {

          //generate a UID
          let uid = uuid.v4();

          //save the uid to draft metadata
          metadata.uid = uid;
          return cloudStorage.associateMetadata({
            objects: [draft],
            data: metadata
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

  ExtensionRegistry.Composer.register(OpenTrackingComposerExtension);
}

export function serialize() {}

export function deactivate() {
  ComponentRegistry.unregister(OpenTrackingButton);
  ComponentRegistry.unregister(OpenTrackingSidebar);
  ComponentRegistry.unregister(BoundOpenTrackingIcon);
  ExtensionRegistry.Composer.unregister(OpenTrackingComposerExtension);
  _unlistenSendDraftSuccess()
}