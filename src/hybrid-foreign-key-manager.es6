import NylasStore from 'nylas-store'
import Actions from './flux/actions'

class HybridForeignKeyManager extends NylasStore {
  constructor() {
    this.foreignKeys = []
    this.listenTo(Actions.objectIdUpdated, this._onObjectIdUpdated)
  }

  registerKey(attributeProps) {
    this.foreignKeys.push(attributeProps)
  }

  _onObjectIdUpdated({oldId, newId}) {
    const DatabaseStore = require('./flux/stores/database-store')
    for (const props of this.foreignKeys) {
      const matchers = {}
      matchers[props.modelKey] = oldId
      DatabaseStore.findAll(props.classConstructor, matchers)
      .then((models = []) => {
        const updatedModels = models.map((model) => {
          model[props.modelKey] = newId
        });
        DatabaseStore.inTransaction((t) => {
          t.persistModels(updatedModels)
        })
      });
    }
  }
}

export default new HybridForeignKeyManager()
