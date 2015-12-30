_ = require 'underscore'
QueryRange = require './query-range'

class QueryResultSet
  constructor: (other = {}) ->
    @_modelsHash = other._modelsHash ? {}
    @_offset = other._offset ? null
    @_ids = other._ids ? []

  clone: ->
    new @constructor({
      _ids: [].concat(@_ids)
      _modelsHash: _.extend({}, @_modelsHash)
      _offset: @_offset
    })

  range: ->
    new QueryRange(offset: @_offset, limit: @_ids.length)

  count: ->
    @_ids.length

  ids: ->
    @_ids

  idAtOffset: (offset) ->
    @_ids[offset - @_offset]

  models: ->
    @_ids.map (id) => @_modelsHash[id]

  modelAtOffset: (offset) ->
    @_modelsHash[@_ids[offset - @_offset]]

  modelWithId: (id) ->
    @_modelsHash[id]

  offsetOfId: (id) ->
    idx = @_ids.indexOf(id)
    return -1 if idx is -1
    return @_offset + idx

module.exports = QueryResultSet
