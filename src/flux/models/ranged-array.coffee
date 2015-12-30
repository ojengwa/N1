Range = require './range'

class RangedArray
  constructor: (range, values) ->
    @_start = range.start
    @_values = values

  range: ->
    new Range(start: @_start, end: @_start + @_values.length)

  values: ->
    @_values

  indexOfValue: (value) ->
    @_values.indexOf(value)

  removeValueAtIndex: (idx) ->
    @_values.splice(idx, 1)

  clipToRange: (range) ->
    if range.start > @_start
      @_values = @_values.slice(range.start - @_start)
      @_start = range.start
    if range.end < @_start + @_values.length
      @_values.length = Math.max(0, range.end - @_start)

  addValuesInRange: (range, values) ->
    if range.end < @_start - 1
      throw new Error("You can only add adjacent values")
    if range.start > @_start + @_values.length
      throw new Error("You can only add adjacent values")

    @_values = [].concat(@_values.slice(0, Math.max(range.start - @_start, 0)), values, @_values.slice(Math.max(range.end - @_start, 0)))
    @_start = Math.min(@_start, range.start)

module.exports = RangedArray