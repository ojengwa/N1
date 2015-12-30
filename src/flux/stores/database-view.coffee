_ = require 'underscore'
Rx = require 'rx-lite'
DatabaseStore = require './database-store'
Message = require '../models/message'
QuerySubscriptionPool = require '../models/query-subscription-pool'
MutableQuerySubscription = require '../models/mutable-query-subscription'
ModelView = require './model-view'

verbose = false

class DatabaseView extends ModelView

  constructor: (query, config = {}, @_metadataProvider) ->
    super
    @_count = -1
    @_itemsWithMetadata = null
    @_resultSet = null
    @_messageQuerySubscription = new MutableQuerySubscription(DatabaseStore.findAll(Message, {threadId: ['nan']}), {asResultSet: true})
    @_threadQuerySubscription = new MutableQuerySubscription(query.limit(0), {asResultSet: true})

    messages = Rx.Observable.fromMutableQuerySubscription('message-list', @_messageQuerySubscription)
    threads = Rx.Observable.fromMutableQuerySubscription('thread-list', @_threadQuerySubscription)

    threads.subscribe (resultSet) =>
      @_messageQuerySubscription.replaceQuery(DatabaseStore.findAll(Message, {threadId: resultSet.ids()}))

    Rx.Observable.combineLatest([threads, messages]).subscribe ([threadResultSet, messageResultSet]) =>
      items = []
      messagesGrouped = {}
      for message in messageResultSet.models()
        messagesGrouped[message.threadId] ?= []
        messagesGrouped[message.threadId].push(message)

      for thread in threadResultSet.models()
        thread = new thread.constructor(thread)
        thread.metadata = messagesGrouped[thread.id]
        items.push(thread)

      @_resultSet = threadResultSet
      @_itemsWithMetadata = items
      @_count = 1000 # HACK
      console.timeEnd("Resolving Messages")
      console.profileEnd("Resolving Messages")
      console.log("TRIGGERING")
      @trigger()

    @

  log: ->
    return unless verbose and not NylasEnv.inSpecMode()
    if _.isString(arguments[0])
      arguments[0] = "DatabaseView (#{@klass.name}): "+arguments[0]
    console.log(arguments...)

  # Accessing Data

  count: ->
    @_count

  loaded: ->
    @_resultSet isnt null

  get: (offset) =>
    unless _.isNumber(offset)
      throw new Error("ModelView.get() takes a numeric index. Maybe you meant getById()?")
    return null unless @_resultSet
    @_itemsWithMetadata[offset - @_resultSet.range().offset]

  getById: (id) ->
    return null unless id
    return @_resultSet.modelCache.get(id)

  indexOfId: (id) ->
    return -1 unless @_resultSet and id
    return @_resultSet.offsetOfId(id)

  itemsCurrentlyInViewMatching: (matchFn) ->
    return [] unless @_resultSet
    @_itemsWithMetadata.filter(matchFn)

  setRetainedRange: ({start, end}) ->
    pageSize = 100
    pagePadding = 100

    roundToPage = (n) -> Math.max(0, Math.round(n / pageSize) * pageSize)

    nextQuery = @_threadQuerySubscription.query().clone()
    nextQuery.offset(roundToPage(start - pagePadding))
    nextQuery.limit(roundToPage((end - start) + pagePadding * 2))

    @_threadQuerySubscription.replaceQuery(nextQuery)

  matchers: ->
    @_threadQuerySubscription.query().matchers()

  invalidate: ({changed, shallow} = {}) ->

  invalidateMetadataFor: ->

  invalidateRetainedRange: ->


module.exports = DatabaseView
