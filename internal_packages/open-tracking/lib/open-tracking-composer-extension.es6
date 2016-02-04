import {ComposerExtension} from 'nylas-exports'
import request from 'request';

post = Promise.promisify(request.post, {multiArgs: true});

export default class OpenTrackingComposerExtension extends ComposerExtension {

  finalizeSessionBeforeSending({session}) {
    body = session.draft().body;
    participants = session.draft().participants();
    sender = session.draft().from;

    // grab message metadata, if any
    
    // if metadata for this app:
    //   generate a UID
    //   insert a tracking pixel <img> into the message with src=http://<plugin_url>/<account_id>/<UID>
    //   store UID in metadata
    //   attach an AFTER-SEND-HOOK:
    //     get the message ID
    //     POST {UID:message_id} to http://<plugin_url>/register-message
    //       set metadata against thread? (if accessible): {tracked: true}
    //       Promise.resolve()
  }
}
