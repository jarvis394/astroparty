const lerp = (a: number, b: number, alpha: number) => {
  return a + alpha * (b - a)
}

export default lerp
