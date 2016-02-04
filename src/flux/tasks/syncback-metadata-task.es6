import Metadatum from '../models/metadatum'
import SyncbackModelTask from './syncback-model-task'

export default class SyncbackMetadataTask extends SyncbackModelTask {
  getModelConstructor() {
    return Metadatum
  }

  getPathAndMethod = (model) => {
    const path = `/metadata/${model.objectId}?client_id=${model.applicationId}`;
    const method = model.serverId ? "PUT" : "POST"
    return {path, method}
  }
}
