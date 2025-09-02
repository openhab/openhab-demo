// randomness.js - JS Script Transformation
// Returns a random value from the interval [input - scale/2, input + scale/2).
// Example usage: JS(randomness.js?scale=100) -> [input - 50, input + 50)
(function(data) {
  const f = parseFloat(data)
  if (isNaN(f)) return data
  if (typeof this.scale !== 'string') {
    console.warn('scale parameter must be defined')
    return data
  }
  const scale = parseFloat(this.scale)
  if (isNaN(scale)) {
    console.warn('scale parameter must be a float')
    return data
  }
  const rnd = Math.random()
  return f + ((this.scale / 2) - rnd * this.scale)
})(input)
