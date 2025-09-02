// randomness.js - JS Script Transformation
// Returns a random value from the interval [input - scale/2, input + scale/2).
// Optionally, the returned value can be limited to either min or max or both.
// Example usage: JS(randomness.js?scale=100) -> value in [input - 50, input + 50)
//                JS(randomness.js?scale=100&min=0&max=100) -> value in [input - 50, input + 50) & [0, 100]
(function(data) {
  const f = parseFloat(data)
  if (isNaN(f)) return data
  const scale = parseFloat(this.scale)
  if (isNaN(scale)) {
    console.warn('scale parameter must be a float')
    return data
  }
  let rnd = f + ((this.scale / 2) - Math.random() * this.scale)
  const min = parseFloat(this.min)
  const max = parseFloat(this.max)
  if (!isNaN(min)) rnd = Math.max(rnd, min)
  if (!isNaN(max)) rnd = Math.min(rnd, max)
  return rnd
})(input)
