
class QueryRange
  constructor: ({@start, @end} = {}) ->
    throw new Error("You must specify a start") if @start is undefined
    throw new Error("You must specify an end") if @end is undefined

  clone: ->
    return new Range({@start, @end})

  intersects: (b) ->
    return @start <= b.start <= @end or @start <= b.end <= @end

  equals: (b) ->
    return @start is b.start and @end is b.end

  rangesBySubtracting: (b) ->
    return [] unless b

    uncovered = []
    if b.start > @start
      uncovered.push new Range({start: @start, end: Math.min(@end, b.start)})
    if b.end < @end
      uncovered.push new Range({start: Math.max(@start, b.end), end: @end})
    uncovered

  rangeFromUnion: (b) ->
    if not @intersects(b)
      throw new Error('You cannot union ranges which do not overlap.')
    new Range
      start: Math.min(@start, b.start)
      end: Math.max(@end, b.end)

module.exports = QueryRange
