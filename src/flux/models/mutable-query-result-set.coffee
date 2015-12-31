_ = require 'underscore'
QueryRange = require './query-range'
QueryResultSet = require './query-result-set'

class MutableQueryResultSet extends QueryResultSet

  immutableClone: ->
    set = new QueryResultSet({
      _ids: [].concat(@_ids)
      _modelsHash: _.extend({}, @_modelsHash)
      _offset: @_offset
    })
    Object.freeze(set)
    Object.freeze(set._ids)
    Object.freeze(set._modelsHash)
    set

  removeAtOffset: (offset) ->
    idx = offset - @_offset
    @_ids.splice(idx, 1)

  clipToRange: (range) ->
    return if range.isInfinite()
    if range.offset > @_offset
      @_ids = @_ids.slice(range.offset - @_offset)
      @_offset = range.offset
    if range.limit < @_ids.length
      @_ids.length = Math.max(0, range.limit)

  addIdsInRange: (rangeIds, range) ->
    if @_offset is null or range.isInfinite()
      @_ids = rangeIds
      @_offset = range.offset
    else
      if range.end < @_offset - 1
        throw new Error("You can only add adjacent values (#{range.end} < #{@_offset - 1})")
      if range.offset > @_offset + @_ids.length
        throw new Error("You can only add adjacent values (#{range.offset} > #{@_offset + @_ids.length})")

      @_ids = [].concat(@_ids.slice(0, Math.max(range.offset - @_offset, 0)), rangeIds, @_ids.slice(Math.max(range.end - @_offset, 0)))
      @_offset = Math.min(@_offset, range.offset)

  attachModelsFrom: (modelsHash) ->
    @_modelsHash = modelsHash

module.exports = MutableQueryResultSet
