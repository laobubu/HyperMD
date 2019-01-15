import { cm_t } from "./type";
import { Token, Position } from "codemirror";
export interface Span {
    type: string;
    text: string;
    head: Token;
    head_i: number;
    tail?: Token;
    tail_i?: number;
    /** the first char's index */
    begin: number;
    /** the index after last char */
    end: number;
}
declare type SpanType = "em" | "strong" | "strikethrough" | "code" | "linkText" | "linkHref" | "task" | "hashtag";
declare const enum SpanAction {
    NOTHING = 0,
    IS_THIS_TYPE = 1,
    LEAVING_THIS_TYPE = 2
}
/**
 * Post-process CodeMirror-mode-parsed lines, find the ranges
 *
 * for example, a parsed line `[**Hello** World](xxx.txt)` will gives you:
 *
 * 1. link from `[` to `)`
 * 2. bold text from `**` to another `**`
 */
declare class LineSpanExtractor {
    cm: cm_t;
    constructor(cm: cm_t);
    caches: Span[][];
    getTokenTypes(token: Token, prevToken?: Token): Record<SpanType, SpanAction>;
    /** get spans from a line and update the cache */
    extract(lineNo: number, precise?: boolean): Span[];
    findSpansAt(pos: Position): Span[];
    findSpanWithTypeAt(pos: Position, type: SpanType): Span;
}
/**
 * Get a `LineSpanExtractor` to extract spans from CodeMirror parsed lines
 *
 * for example, a parsed line `[**Hello** World](xxx.txt)` will gives you:
 *
 * 1. link from `[` to `)`
 * 2. bold text from `**` to another `**`
 */
export declare function getLineSpanExtractor(cm: cm_t): LineSpanExtractor;
export {};
