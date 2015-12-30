_ = require 'underscore'
Rx = require 'rx-lite'
DatabaseStore = require './database-store'
Message = require '../models/message'
QuerySubscriptionPool = require '../models/query-subscription-pool'
MutableQuerySubscription = require '../models/mutable-query-subscription'
Range = require '../models/range'
ModelView = require './model-view'

verbose = false

class DatabaseView extends ModelView

  constructor: (@query, config = {}, @_metadataProvider) ->
    super
    @_count = -1
    @_items = null
    @_itemsRange = null
    @_threadQuerySubscription = new MutableQuerySubscription(@query)

    @_observer = @_build().subscribe (data) =>
      [threads, range, messagesForThreads...] = data
      for thread, idx in threads
        threads[idx] = new thread.constructor(thread)
        threads[idx].metadata = messagesForThreads[idx]

      @_itemsRange = range
      @_items = threads
      @_count = 1000 # HACK
      console.log("TRIGGERING")
      @trigger()

    @

  _build: ->
    Rx.Observable.create (observer) =>
      unsubscribe = QuerySubscriptionPool.addPrivateSubscription @_threadQuerySubscription, (threads, range) ->
        observer.onNext({threads, range})
      return Rx.Disposable.create(unsubscribe)
    .flatMapLatest ({threads, range}) =>
      messagesObservables = [Rx.Observable.from([threads]), Rx.Observable.from([range])]
      messagesObservables = messagesObservables.concat threads.map (thread) ->
        Rx.Observable.fromQuery(DatabaseStore.findAll(Message, {threadId: thread.id}))
      Rx.Observable.combineLatest(messagesObservables)
    .debounce(1)

  log: ->
    return unless verbose and not NylasEnv.inSpecMode()
    if _.isString(arguments[0])
      arguments[0] = "DatabaseView (#{@klass.name}): "+arguments[0]
    console.log(arguments...)

  # Accessing Data

  count: ->
    @_count

  loaded: ->
    @_items isnt null

  get: (idx) =>
    unless _.isNumber(idx)
      throw new Error("ModelView.get() takes a numeric index. Maybe you meant getById()?")
    @_items?[idx - @_itemsRange.start]

  getById: (id) ->
    return null unless id
    return @_threadQuerySubscription._modelCache.get(id)

  indexOfId: (id) ->
    return -1 unless @_items and id
    return @_itemsRange.start + _.findIndex @_items, (item) -> item.id is id or item.clientId is id

  itemsCurrentlyInViewMatching: (matchFn) ->
    return [] unless @_items
    @_items.filter(matchFn)

  setRetainedRange: ({start, end}) ->
    pageSize = 10
    pagePadding = 50

    rangeLength = end - start
    rangeStart = Math.max(0, Math.round((start - pagePadding) / pageSize) * pageSize)
    rangeEnd = rangeStart + rangeLength + pagePadding * 2
    @_threadQuerySubscription.setRange(new Range({start: rangeStart, end: rangeEnd}))

  invalidate: ({changed, shallow} = {}) ->

  invalidateMetadataFor: ->

  invalidateRetainedRange: ->


module.exports = DatabaseView
