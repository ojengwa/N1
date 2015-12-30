class QueryRange
  @infinite: ->
    return new QueryRange({limit: null, offset: null})

  Object.defineProperty @prototype, "start",
    enumerable: false
    get: -> @offset

  Object.defineProperty @prototype, "end",
    enumerable: false
    get: -> @offset + @limit

  constructor: ({@limit, @offset, start, end} = {}) ->
    @offset ?= start if start?
    @limit ?= end - @offset if end?
    throw new Error("You must specify a limit") if @limit is undefined
    throw new Error("You must specify an offset") if @offset is undefined

  clone: ->
    return new QueryRange({@limit, @offset})

  isInfinite: ->
    return @limit is null and @offset is null

  isEqual: (b) ->
    return @start is b.start and @end is b.end

  intersects: (b) ->
    return true if @isInfinite() or b.isInfinite()
    return @start <= b.start <= @end or @start <= b.end <= @end

  rangesBySubtracting: (b) ->
    return [] unless b
    if @isInfinite() or b.isInfinite()
      throw new Error("Unimplemented")

    uncovered = []
    if b.start > @start
      uncovered.push new QueryRange({start: @start, end: Math.min(@end, b.start)})
    if b.end < @end
      uncovered.push new QueryRange({start: Math.max(@start, b.end), end: @end})
    uncovered

  rangeFromUnion: (b) ->
    return QueryRange.infinite() if @isInfinite() or b.isInfinite()
    if not @intersects(b)
      throw new Error('You cannot union ranges which do not overlap.')

    new QueryRange
      start: Math.min(@start, b.start)
      end: Math.max(@end, b.end)

module.exports = QueryRange
