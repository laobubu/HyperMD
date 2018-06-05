export function getLineNo(text: string, pos: number) {
  var pos2: number = -1, ans = 0
  do {
    ans++
    pos2 = text.indexOf("\n", pos2 + 1)
  } while (pos2 != -1 && pos2 < pos);
  return ans
}

/**
 * Replace part of a string
 * @param end if not number, will delete nothing.
 */
export function strModPart(text: string, start: number, end: number = null, insertion?: string) {
  if (!end && !insertion) return text
  var left = text.slice(0, start)
  var right = text.slice((typeof end !== 'number') ? start : end)
  return left + (insertion || "") + right
}
