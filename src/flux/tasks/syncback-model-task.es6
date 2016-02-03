import _ from 'underscore'
import Task from './task'
import NylasAPI from '../nylas-api'
import Actions from '../actions'
import {APIError} from '../errors'
import DatabaseStore from '../stores/database-store'

export default class SyncbackModelTask extends Task {

  constructor({clientId, endpoint} = {}) {
    super()
    this.clientId = clientId
    this.endpoint = endpoint
  }

  shouldDequeueOtherTask(other) {
    return (other instanceof SyncbackModelTask &&
            this.clientId === other.clientId)
  }

  getModelConstructor() {
    throw new Error("You must subclass and implement `getModelConstructor`. Return a constructor class")
  }

  performLocal() {
    this.validateRequiredFields(["clientId"])
    return Promise.resolve()
  }

  performRemote() {
    return Promise.resolve()
    .then(this.getLatestModel)
    .then(this.verifyModel)
    .then(this.makeRequest)
    .then(this.updateLocalModel)
    .thenReturn(Task.Status.Success)
    .catch(this.handleRemoteError)
  }

  getLatestModel = () => {
    return DatabaseStore.findBy(this.getModelConstructor(),
                                {clientId: this.clientId})
  }

  verifyModel = (model) => {
    if (model) {
      return Promise.resolve(model)
    }
    throw new Error(`Can't find a '${this.getModelConstructor().name}' model for clientId: ${this.clientId}'`)
  }

  makeRequest = (model) => {
    const data = this.getPathAndMethod(model)

    return NylasAPI.makeRequest({
      accountId: model.accountId,
      path: data.path,
      method: data.method,
      body: model.toJSON(),
      returnsModel: false,
    })
  }

  getPathAndMethod = (model) => {
    if (model.serverId) {
      return {
        path: `${this.endpoint}/${model.serverId}`,
        method: "PUT",
      }
    }
    return {
      path: `${this.endpoint}`,
      method: "POST",
    }
  }

  /**
   * Updates the localModel with new data from the Database
   *
   * NOTE: It's important that we override only the version and new
   * serverId of an object. The API may have taken a long time and in the
   * meantime, the local object may have updated. It's important we're
   * updating the latest object.
   *
   * We also don't want to update any field other then the version and id.
   * If other fields have gotten out of sync, we defer to the ones on the
   * client (since that's what the user sees). This is important for
   * objects like Drafts.
   *
   * We also need to notify when the serverId changes
   */
  updateLocalModel = ({version, id}) => {
    return DatabaseStore.inTransaction((t) => {
      return this.getLatestModel().then((model) => {
        // Model may have been deleted
        if (!model) { return Promise.resolve() }

        model.version = version
        if (model.serverId !== id) {
          model.serverId = id;
          Actions.serverIdUpdated({clientId: model.clientId, serverId: id})
        }
        return t.persistModel(model)
      })
    }).thenReturn(true)
  }

  handleRemoteError = (err) => {
    if (err instanceof APIError) {
      if (!(_.includes(NylasAPI.PermanentErrorCodes, err.statusCode))) {
        return Promise.resolve(Task.Status.Retry)
      }
      return Promise.resolve([Task.Status.Failed, err])
    }
    NylasEnv.emitError(err);
    return Promise.resolve([Task.Status.Failed, err])
  }

  canBeUndone() { return false }

  isUndo() { return false }
}
