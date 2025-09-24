/**
 * Splits an array into chunks
 */
module.exports = function chunkArray(arr, size) {
    const temp = [];
    for (let i = 0; i < arr.length; i += size) {
      temp.push(arr.slice(i, i + size));
    }
    return temp;
  };
  