_ = require 'underscore'
QueryRange = require './query-range'
LRUCache = require '../../lru-cache'

class QueryRangedResultSet
  constructor: ->
    @modelCache = new LRUCache(100)
    @_offset = null
    @_ids = []

  clone: ->
    q = new QueryRangedResultSet()
    q.modelCache = modelCache
    q._off
  range: ->
    new QueryRange(offset: @_offset, limit: @_ids.length)

  ids: ->
    @_ids

  idsOfMissingModels: ->
    @_ids.filter (id) => @modelCache.find(id)

  models: ->
    @_ids.map (id) => @modelCache.get(id)

  modelWithId: (id) ->
    @modelCache.get(id)

  offsetOfId: (id) ->
    idx = @_ids.indexOf(id)
    return -1 if idx is -1
    return @_offset + idx

  removeAtOffset: (offset) ->
    idx = offset - @_offset
    @modelCache.remove(@_ids[idx])
    @_ids.splice(idx, 1)

  clipToRange: (range) ->
    if range.offset > @_offset
      @_ids = @_ids.slice(range.offset - @_offset)
      @_offset = range.offset
    if range.limit < @_ids.length
      @_ids.length = Math.max(0, range.limit)

  addIdsInRange: (range, rangeIds) ->
    if range.end < @_offset - 1
      throw new Error("You can only add adjacent values")
    if range.offset > @_offset + @_ids.length
      throw new Error("You can only add adjacent values")

    @_ids = [].concat(@_ids.slice(0, Math.max(range.offset - @_offset, 0)), rangeIds, @_ids.slice(Math.max(range.end - @_offset, 0)))
    @_offset = Math.min(@_offset, range.offset)

    # Ensure we always have enough cache space for the entire result set
    @modelCache.limit = Math.max(@modelCache.limit, @_ids.length + 20)

  addModelsInRange: (range, rangeModels) ->
    @addIdsInRange(range, _.pluck(rangeModels, 'id'))
    @modelCache.put(model.id, model) for model in rangeModels

module.exports = QueryRangedResultSet
