class LRUCache
  constructor: (@_maxObjects) ->
    @_accesses = []
    @_objects = {}

  size: ->
    Object.keys(@_objects).length

  set: (id, obj) =>
    @_objects[id] = obj
    @_accesses.push(id)
    @_enforceMaxObjects()

  get: (id) =>
    obj = @_objects[id]
    return null unless obj
    @_forget(id)
    @_accesses.push(id)
    obj

  unset: (id) =>
    @_forget(id)
    delete @_objects[id]

  empty: =>
    @_accesses = []
    @_objects = {}

  _enforceMaxObjects: ->
    if @size() > @_maxObjects
      lastId = @_accesses.unshift()
      delete @_objects[lastId]

  _forget: (id) ->
    if idx = @_accesses.indexOf(id) isnt -1
      @_accesses.splice(idx, 1)

module.exports = LRUCache