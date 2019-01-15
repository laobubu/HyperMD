/**
 * CodeMirror-related utils
 *
 * @internal Part of HyperMD core.
 *
 * You shall NOT import this file; please import "core" instead
 */
import * as cm_internal from "./cm_internal";
import { cm_t } from "./type";
import { Token, Position, cmpPos } from "codemirror";
export { cm_internal };
type TokenSeekResult = TokenSeeker.ResultType;
/**
 * Useful tool to seek for tokens
 *
 *     var seeker = new TokenSeeker(cm)
 *     seeker.setPos(0, 0) // set to line 0, char 0
 *     var ans = seeker.findNext(/fomratting-em/)
 *
 */
export declare class TokenSeeker {
    cm: cm_t;
    constructor(cm: cm_t);
    line: CodeMirror.LineHandle;
    lineNo: number;
    lineTokens: Token[];
    i_token: number;
    /**
     * Find next Token that matches the condition AFTER current token (whose index is `i_token`), or SINCE a given position
     *
     * This function will NOT make the stream precede! Use `setPos` to change position.
     *
     * @param condition a RegExp to check token.type, or a function check the Token
     * @param maySpanLines by default the searching will not span lines
     */
    findNext(condition: TokenSeeker.ConditionType, maySpanLines?: boolean, since?: Position): TokenSeekResult;
    /**
     * In current line, find next Token that matches the condition SINCE the token with given index
     *
     * This function will NOT make the stream precede! Use `setPos` to change position.
     *
     * @param condition a RegExp to check token.type, or a function check the Token
     * @param i_token_since default: i_token+1 (the next of current token)
     */
    findNext(condition: TokenSeeker.ConditionType, i_token_since: number): TokenSeekResult;
    /**
     * Reversely find next Token that matches the condition BEFORE current token (whose index is `i_token`), or SINCE a given position
     *
     * This function will NOT make the stream rewind! Use `setPos` to change position.
     *
     * @param condition a RegExp to check token.type, or a function check the Token
     * @param maySpanLines by default the searching will not span lines
     */
    findPrev(condition: TokenSeeker.ConditionType, maySpanLines?: boolean, since?: Position): TokenSeekResult;
    /**
     * In current line, reversely find next Token that matches the condition SINCE the token with given index
     *
     * This function will NOT make the stream rewind! Use `setPos` to change position.
     *
     * @param condition a RegExp to check token.type, or a function check the Token
     * @param i_token_since default: i_token-1 (the prev of current token)
     */
    findPrev(condition: TokenSeeker.ConditionType, i_token_since: number): TokenSeekResult;
    /**
     * return a range in which every token has the same style, or meet same condition
     */
    expandRange(style: string | TokenSeeker.ConditionType, maySpanLines?: boolean): {
        from: TokenSeekResult;
        to: TokenSeekResult;
    };
    setPos(ch: number): any;
    setPos(line: number | CodeMirror.LineHandle, ch: number): any;
    /**
     * Update seeker's cursor position
     *
     * @param precise if true, lineTokens will be refresh even if lineNo is not changed
     */
    setPos(line: number | CodeMirror.LineHandle, ch: number, precise?: boolean): any;
    /** get (current or idx-th) token */
    getToken(idx?: number): Token;
    /** get (current or idx-th) token type. always return a string */
    getTokenType(idx?: number): string;
}
export declare namespace TokenSeeker {
    type ConditionFunction = (token: Token, lineTokens: Token[], token_index: number) => boolean;
    type ConditionType = RegExp | ConditionFunction;
    type ResultType = {
        lineNo: number;
        token: Token;
        i_token: number;
    };
}
/**
 * CodeMirror's `getLineTokens` might merge adjacent chars with same styles,
 * but this one won't.
 *
 * This one will consume more memory.
 *
 * @param {CodeMirror.LineHandle} line
 * @returns {string[]} every char's style
 */
export declare function getEveryCharToken(line: CodeMirror.LineHandle): string[];
/**
 * return a range in which every char has the given style (aka. token type).
 * assuming char at `pos` already has the style.
 *
 * the result will NOT span lines.
 *
 * @param style aka. token type
 * @see TokenSeeker if you want to span lines
 */
export declare function expandRange(cm: cm_t, pos: CodeMirror.Position, style: string | ((token: Token) => boolean)): {
    from: Position;
    to: Position;
};
export { cmpPos };
export declare type RangeLike = {
    anchor: Position;
    head: Position;
};
export declare type OrderedRange = [Position, Position];
/**
 * Get ordered range from `CodeMirror.Range`-like object or `[Position, Position]`
 *
 * In an ordered range, The first `Position` must NOT be after the second.
 */
export declare function orderedRange(range: [Position, Position] | RangeLike): OrderedRange;
/**
 * Check if two range has intersection.
 *
 * @param range1 ordered range 1  (start <= end)
 * @param range2 ordered range 2  (start <= end)
 */
export declare function rangesIntersect(range1: OrderedRange, range2: OrderedRange): boolean;
