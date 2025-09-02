// randomness.js - JS Script Transformation
// Returns a random value from the interval [input - scale/2, input + scale/2).
// Parameters:
//   - scale (required): the size of the randomness interval
//   - min (optional): lower bound for the value
//   - max (optional): upper bound for the value
//   - forwardZero (optional): forward zero without applying randomness
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
  if (typeof this.forwardZero !== 'undefined' && data.split(' ')[0] === '0') return data
  let rnd = f + ((this.scale / 2) - Math.random() * this.scale)
  const min = parseFloat(this.min)
  const max = parseFloat(this.max)
  if (!isNaN(min)) rnd = Math.max(rnd, min)
  if (!isNaN(max)) rnd = Math.min(rnd, max)
  return rnd
})(input)
