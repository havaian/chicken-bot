module.exports = (eggs) => {
  const nonZeroCategories = {};

  for (const [key, value] of Object.entries(eggs)) {
    if (value > 0) {
      nonZeroCategories[key] = value;
    }
  }

  return nonZeroCategories;
}