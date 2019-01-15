import * as CodeMirror from 'codemirror';
import { Token } from 'codemirror';
import { cm_t } from '../core/type';
/**
 * continue list / quote / insert table row
 * start a table
 */
export declare function newlineAndContinue(cm: cm_t): any;
/** insert "\n" , or if in list, insert "\n" + indentation */
export declare function newline(cm: cm_t): any;
/** unindent or move cursor into prev table cell */
export declare function shiftTab(cm: cm_t): void;
/**
 * 1. for tables, move cursor into next table cell, and maybe insert a cell
 * 2.
 */
export declare function tab(cm: cm_t): void;
/**
 * add / delete bracket pair to every selections,
 * or just add left bracket to cursor if nothing selected.
 *
 * This provides a `createStyleToggler`-like feature,
 * but don't rely on HyperMD mode
 *
 * @example
 *     When brackets are "(" and ")" :
 *     (Hello) => Hello   (Selected "(Hello)" or just "Hello")
 *     Hello   => (Hello)
 *
 * @param rightBracket if null, will use leftBracket
 */
export declare function wrapTexts(cm: cm_t, leftBracket: string, rightBracket?: string): any;
export declare function createStyleToggler(isStyled: (state: any) => boolean, isFormattingToken: (token: Token) => boolean, getFormattingText: (state?: any) => string): (cm: CodeMirror.Editor) => any;
export declare var keyMap: CodeMirror.KeyMap;
