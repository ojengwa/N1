_ = require 'underscore'
DatabaseStore = require '../stores/database-store'
QueryRange = require './query-range'
MutableQueryResultSet = require './mutable-query-result-set'

class QuerySubscription
  constructor: (@_query, @_options = {}) ->
    @_set = null
    @_version = 0
    @_callbacks = []
    @_lastResult = null
    @_modelCache = {}

    if @_query
      if @_query._count
        throw new Error("QuerySubscriptionPool::add - You cannot listen to count queries.")

      @_query.finalize()

      if @_options.initialModels
        ids = _.pluck(@_options.initialModels, 'id')
        @_set = new MutableQueryResultSet(_offset: 0, _ids: ids)
        @_appendToModelCache(@_options.initialModels)
        @_createResultAndTrigger()
      else
        @update()

  query: =>
    @_query

  addCallback: (callback) =>
    unless callback instanceof Function
      throw new Error("QuerySubscription:addCallback - expects a function, received #{callback}")
    @_callbacks.push(callback)

    if @_lastResult
      process.nextTick =>
        return unless @_lastResult
        callback(@_lastResult)

  hasCallback: (callback) =>
    @_callbacks.indexOf(callback) isnt -1

  removeCallback: (callback) =>
    unless callback instanceof Function
      throw new Error("QuerySubscription:removeCallback - expects a function, received #{callback}")
    @_callbacks = _.without(@_callbacks, callback)

  callbackCount: =>
    @_callbacks.length

  applyChangeRecord: (record) =>
    return unless @_query and record.objectClass is @_query.objectClass()
    return unless record.objects.length > 0

    return @update() if not @_set

    impactCount = 0
    mustRefetchAllIds = false

    if record.type is 'unpersist'
      for item in record.objects
        delete @_modelCache[item.id]
        offset = @_set.offsetOfId(item.id)
        if offset isnt -1
          @_set.removeAtOffset(offset)
          impactCount += 1

    else if record.type is 'persist'
      for item in record.objects
        offset = @_set.offsetOfId(item.id)
        itemIsInSet = offset isnt -1
        itemShouldBeInSet = item.matches(@_query.matchers())

        if itemIsInSet and not itemShouldBeInSet
          delete @_modelCache[item.id]
          @_set.removeAtOffset(offset)
          impactCount += 1

        else if itemShouldBeInSet and not itemIsInSet
          @_modelCache[item.id] = item
          mustRefetchAllIds = true
          impactCount += 1

        else if itemIsInSet
          oldItem = @_modelCache[item.id]
          @_modelCache[item.id] = item
          impactCount += 1
          mustRefetchAllIds = true if @_itemSortOrderHasChanged(oldItem, item)

    if impactCount > 0
      @_set = null if mustRefetchAllIds
      @update()

  _itemSortOrderHasChanged: (old, updated) ->
    for descriptor in @_query.orderSortDescriptors()
      oldSortValue = old[descriptor.attr.modelKey]
      updatedSortValue = updated[descriptor.attr.modelKey]

      # http://stackoverflow.com/questions/4587060/determining-date-equality-in-javascript
      if not (oldSortValue >= updatedSortValue && oldSortValue <= updatedSortValue)
        return true

    return false

  update: =>
    version = @_version += 1

    desiredRange = @_query.range()
    currentRange = @_set?.range()

    if currentRange and not currentRange.isInfinite() and not desiredRange.isInfinite()
      ranges = QueryRange.rangesBySubtracting(desiredRange, currentRange)
      entireModels = true
    else
      ranges = [desiredRange]
      entireModels = Object.keys(@_modelCache).length is 0

    Promise.each ranges, (range) =>
      return unless version is @_version
      @_fetchRange(range, {entireModels})
    .then =>
      return unless version is @_version
      ids = @_set.ids().filter (id) => not @_modelCache[id]
      return if ids.length is 0
      return DatabaseStore.findAll(@_query._klass, {id: ids}).then(@_appendToModelCache)
    .then =>
      return unless version is @_version
      @_createResultAndTrigger()

  _fetchRange: (range, {entireModels} = {}) =>
    rangeQuery = undefined

    unless range.isInfinite()
      rangeQuery ?= @_query.clone()
      rangeQuery.offset(range.offset).limit(range.limit)

    unless entireModels
      rangeQuery ?= @_query.clone()
      rangeQuery.idsOnly()

    rangeQuery ?= @_query

    DatabaseStore.run(rangeQuery, {format: false}).then (results) =>
      ids = if entireModels then _.pluck(results, 'id') else results

      @_set = null unless @_set?.range().intersects(range)
      @_set ?= new MutableQueryResultSet()
      @_set.addIdsInRange(ids, range)
      @_set.clipToRange(@_query.range())

      @_appendToModelCache(results) if entireModels

  _appendToModelCache: (arr) =>
    @_modelCache[m.id] = m for m in arr

  _trimModelCache: =>
    old = @_modelCache
    @_modelCache = {}
    @_modelCache[id] = old[id] for id in @_set.ids()

  _createResultAndTrigger: =>
    @_trimModelCache()
    @_set.attachModelsFrom(@_modelCache)

    unless @_set.isComplete()
      console.warn("QuerySubscription: tried to publish a result set missing models.")
      return

    if @_options.asResultSet
      @_lastResult = @_set.immutableClone()
    else
      @_lastResult = @_query.formatResultObjects(@_set.models())

    @_callbacks.forEach (callback) =>
      callback(@_lastResult)


module.exports = QuerySubscription
