export function getLineNo(text: string, pos: number) {
  var pos2: number = -1, ans = 1
  while (true) {
    pos2 = text.indexOf("\n", pos2 + 1)

    if (pos2 == -1 || pos2 > pos) break
    else ans++
  }
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
