import AttributeString from './attribute-string'
import HybridForeignKeyManager from './hybrid-foreign-key-manager'

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
  constructor(props) {
    super(props)
    HybridForeignKeyManager.register(props)
  }
}
