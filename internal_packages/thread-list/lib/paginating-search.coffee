_ = require 'underscore'
Rx = require 'rx-lite'

{NylasAPI,
 Thread,
 MutableQuerySubscription,
 DatabaseStore} = require 'nylas-exports'

class PaginatingSearch

  constructor: (@_terms, @_accountId) ->
    @_sort = 'datetime'
    @_pageFetched = []
    @subscription = new MutableQuerySubscription(null, {asResultSet: true})

    _.defer => @retrievePage(0)

    @

  observable: =>
    Rx.Observable.fromPrivateQuerySubscription('search-results', @subscription)

  terms: =>
    @_terms

  setTerms: (terms) =>
    @_terms = terms
    @_pageFetched = []
    @retrievePage(0)

  setSortOrder: (sort) =>
    @_sort = sort
    @_pageFetched = []
    @retrievePage(0)

  setRange: (range) =>
    @retrievePage(Math.floor(range.start / 100))

  # Accessing Data

  retrievePage: (idx) =>
    # For now, we never refresh a page we've already loaded. In the future, we may
    # want to pull existing pages from the database ala WHERE `id` IN (ids from page)
    return if @_pageFetched[idx]
    @_pageFetched[idx] = true

    NylasAPI.makeRequest
      method: 'GET'
      path: "/threads/search?q=#{encodeURIComponent(@_terms)}"
      accountId: @_accountId
      json: true
      returnsModel: true
    .then (threads) =>
      query = DatabaseStore.findAll(Thread).where(id: _.pluck(threads, 'id'))
      @subscription.replaceQuery(query)

    .catch (error) =>
      @_pageFetched[idx] = false

module.exports = PaginatingSearch
