import AttributeString from './attribute-string'

/**
 * Public: The value of this attribute is always a string or `null`.
 *
 * String attributes can be queries using `equal`, `not`, and `startsWith`. Matching on
 * `greaterThan` and `lessThan` is not supported.
 *
 * Section: Database
 *
 */
export default class AttributeHybridForeignKey extends AttributeString {
  constructor({modelKey, queryable, jsonKey, classConstructor}) {
    super({modelKey, queryable, jsonKey})
    const DatabaseStore = require('../stores/database-store')
    DatabaseStore.registerHybridForeignKey({modelKey, classConstructor})
  }
}
