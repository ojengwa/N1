import Actions from './flux/actions'

class HybridForeignKeyManager {
  constructor() {
    this.foreignKeys = []
    Actions.objectIdUpdated.listen(this._onObjectIdUpdated)
  }

  register(attributeProps) {
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
