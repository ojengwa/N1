import Model from './model'
import Attributes from '../attributes'

/**
 Cloud-persisted data that is associated with a single Nylas API object
 (like a `Thread`, `Message`, or `Account`).

 Each Nylas API object can have exactly one `Metadatum` object associated
 with it. If you update the metadata object on an existing associated
 Nylas API object, it will override the previous `value`
*/
export default class Metadatum extends Model {
  static attributes = Object.assign({}, Model.attributes, {
    /*
    The unique ID of the plugin that owns this Metadatum item. The Nylas
    N1 Database holds the Metadatum objects for many of its installed
    plugins.
    */
    applicationId: Attributes.String({
      queryable: true,
      modelKey: 'applicationId',
      jsonKey: 'application_id',
    }),

    /*
    The type of Nylas API object this Metadatum item is associated with.
    Should be the lowercase singular classname of an object like
    `thread` or `message`, or `account`
    */
    objectType: Attributes.String({
      queryable: true,
      modelKey: 'objectType',
      jsonKey: 'object_type',
    }),

    /**
     * The ID of the associated Nylas API object.
     *
     * NOTE: The associated objectID can be either a local `clientId` or a
     * `serverId`. In the case of a draft.
     *
     */
    objectId: Attributes.HybridForeignKey({
      queryable: true,
      modelKey: 'objectId',
      jsonKey: 'object_id',
      classConstructor: Metadatum,
    }),

    /*
    The current version of this `Metadatum` object. Note that since Nylas
    API objects can only have exactly one `Metadatum` object attached to
    it, any action preformed on the `Metadatum` of a Nylas API object
    will override the existing object and bump the `version`.
    */
    version: Attributes.Number({
      modelKey: 'version',
      jsonKey: 'version',
    }),

    // A generic value that can be any string-serializable object.
    value: Attributes.Object({
      modelKey: 'value',
      jsonKey: 'value',
    }),
  });
}
