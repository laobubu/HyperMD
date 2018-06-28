import { Test } from "hypermd_test/tester";
import { createModeTask, ExpectData } from "./_base";

export const test = new Test('Hashtag in HyperMD')

const modeOpt = { hashtag: true };

/**
 * Create a tester function
 *
 * @param expect if not given, will assume current hypermd mode is correct
 *               and output the `expect` value sample
 */
function _T(input: string, expect?: ExpectData | string[][]) {
  return createModeTask(input, expect, modeOpt);
}


test.add('Basic', _T(`#Hello #tag name#`, [
  ["#", "formatting formatting-hashtag hashtag hashtag-begin meta"],
  ["Hello", "hashtag hashtag-end meta"],
  [" ", ""],
  ["#", "formatting formatting-hashtag hashtag hashtag-begin meta"],
  ["tag", "hashtag meta"],
  [" ", "hashtag meta"],
  ["name", "hashtag meta"],
  ["#", "formatting formatting-hashtag hashtag hashtag-end meta"],
]))

test.add('Keep Headers', _T(`# Hello#`, [
  ["# ", "formatting formatting-header formatting-header-1 header header-1 line-HyperMD-header line-HyperMD-header-1"],
  ["Hello", "header header-1"],
  ["#", "formatting formatting-header formatting-header-1 header header-1"],
]))

test.add('No leading/tailing spaces in tag name', _T(`#Bad # #Good\\ #`, [
  ["#", "formatting formatting-hashtag hashtag hashtag-begin meta"],
  ["Bad", "hashtag hashtag-end meta"],
  [" ", ""],
  ["#", ""],
  [" ", ""],
  ["#", "formatting formatting-hashtag hashtag hashtag-begin meta"],
  ["Good", "hashtag meta"],
  ["\\", "formatting-escape hashtag hmd-escape-backslash meta"],
  [" ", "escape hashtag hmd-escape-char meta"],
  ["#", "formatting formatting-hashtag hashtag hashtag-end meta"],
]))

test.add("Tag name can't be pure decimal, unless using two hash symbol", _T(`#15 xyz#abc #12 #34# #56 xyz#`, [
  ["#", ""],
  ["15", ""],
  [" ", ""],
  ["xyz", ""],
  ["#", ""],
  ["abc", ""],
  [" ", ""],
  ["#", ""],
  ["12", ""],
  [" ", ""],
  ["#", "formatting formatting-hashtag hashtag hashtag-begin meta"],
  ["34", "hashtag meta"],
  ["#", "formatting formatting-hashtag hashtag hashtag-end meta"],
  [" ", ""],
  ["#", "formatting formatting-hashtag hashtag hashtag-begin meta"],
  ["56", "hashtag meta"],
  [" ", "hashtag meta"],
  ["xyz", "hashtag meta"],
  ["#", "formatting formatting-hashtag hashtag hashtag-end meta"],
]))

test.add('Space before hashtag', _T(`This is not#cool\nnor this#bad tag#`, [
  ["This", ""],
  [" ", ""],
  ["is", ""],
  [" ", ""],
  ["not", ""],
  ["#", ""],
  ["cool", ""],
  ["\n", ""],
  ["nor", ""],
  [" ", ""],
  ["this", ""],
  ["#", ""],
  ["bad", ""],
  [" ", ""],
  ["tag", ""],
  ["#", ""],
]))

test.add('Escaped #', _T(`This \\#not-tag`, [
  ["This", ""],
  [" ", ""],
  ["\\", "formatting-escape hmd-escape-backslash"],
  ["#", "escape hmd-escape-char"],
  ["not-tag", ""],
]))

test.add("Tags can't be inside code or link href", _T("[link](hey #you) `Code #abcd `", [
  ["[", "formatting formatting-link link"],
  ["link", "link"],
  ["]", "formatting formatting-link link"],
  ["(", "formatting formatting-link-string string url"],
  ["hey #you", "string url"],
  [")", "formatting formatting-link-string string url"],
  [" ", ""],
  ["`", "formatting formatting-code inline-code"],
  ["Code", "inline-code"],
  [" ", "inline-code"],
  ["#", "inline-code"],
  ["abcd", "inline-code"],
  [" ", "inline-code"],
  ["`", "formatting formatting-code inline-code"],
]))

test.add("Break a tag with invalid chars(eg. comma)", _T("#gwegwe,ABC  #DEF, HI#z\nlorem", [
  ["#", "formatting formatting-hashtag hashtag hashtag-begin meta"],
  ["gwegwe", "hashtag hashtag-end meta"],
  [",ABC", ""],
  [" ", ""],
  [" ", ""],
  ["#", "formatting formatting-hashtag hashtag hashtag-begin meta"],
  ["DEF", "hashtag hashtag-end meta"],
  [",", ""],
  [" ", ""],
  ["HI", ""],
  ["#", ""],
  ["z", ""],
  ["\n", ""],
  ["lorem", ""],
]))

test.add("Misc: hashtags in header", _T("# #aa!#bcd #efg#", [
  ["# ", "formatting formatting-header formatting-header-1 header header-1 line-HyperMD-header line-HyperMD-header-1"],
  ["#", "formatting formatting-hashtag hashtag hashtag-begin header header-1 meta"],
  ["aa", "hashtag hashtag-end header header-1 meta"],
  ["!", "header header-1"],
  ["#", "header header-1"],
  ["bcd", "header header-1"],
  [" ", "header header-1"],
  ["#", "formatting formatting-hashtag hashtag hashtag-begin header header-1 meta"],
  ["efg", "hashtag header header-1 meta"],
  ["#", "formatting formatting formatting-hashtag hashtag hashtag-end header header-1 meta"],
]))
