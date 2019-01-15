import * as CodeMirror from "codemirror";
import "codemirror/mode/markdown/markdown";
import "./hypermd.css";
export declare type TokenFunc = (stream: CodeMirror.StringStream, state: HyperMDState) => string;
export interface MarkdownStateLine {
    stream: CodeMirror.StringStream;
    header?: boolean;
    hr?: boolean;
    fencedCodeEnd?: boolean;
}
export interface MarkdownState {
    f: TokenFunc;
    prevLine: MarkdownStateLine;
    thisLine: MarkdownStateLine;
    block: TokenFunc;
    htmlState: any;
    indentation: number;
    localMode: CodeMirror.Mode<any>;
    localState: any;
    inline: TokenFunc;
    text: TokenFunc;
    formatting: string | string[] | false;
    linkText: boolean;
    linkHref: boolean;
    linkTitle: boolean;
    image?: boolean;
    imageMarker?: boolean;
    imageAltText?: boolean;
    /** -1 means code-block and +1,2,3... means ``inline ` quoted codes`` */
    code: false | number;
    em: false | string;
    strong: false | string;
    header: number;
    setext: 0 | 1 | 2;
    hr: boolean;
    taskList: boolean;
    list: true | null | false;
    listStack: number[];
    quote: number;
    indentedCode: boolean;
    trailingSpace: number;
    trailingSpaceNewLine: boolean;
    strikethrough: boolean;
    emoji: boolean;
    fencedEndRE: null | RegExp;
    indentationDiff?: number;
}
export declare type InnerModeExitChecker = (stream: CodeMirror.StringStream, state: HyperMDState) => {
    endPos?: number;
    skipInnerMode?: boolean;
    style?: string;
};
export interface HyperMDState extends MarkdownState {
    hmdTable: TableType;
    hmdTableID: string;
    hmdTableColumns: string[];
    hmdTableCol: number;
    hmdTableRow: number;
    hmdOverride: TokenFunc;
    hmdHashtag: HashtagType;
    hmdInnerStyle: string;
    hmdInnerExitChecker: InnerModeExitChecker;
    hmdInnerMode: CodeMirror.Mode<any>;
    hmdInnerState: any;
    hmdLinkType: LinkType;
    hmdNextMaybe: NextMaybe;
    hmdNextState: HyperMDState;
    hmdNextStyle: string;
    hmdNextPos: number;
}
export declare const enum HashtagType {
    NONE = 0,
    NORMAL = 1,
    WITH_SPACE = 2
}
export declare const enum TableType {
    NONE = 0,
    SIMPLE = 1,
    NORMAL = 2
}
export declare const enum NextMaybe {
    NONE = 0,
    FRONT_MATTER = 1,
    FRONT_MATTER_END = 2
}
export declare const enum LinkType {
    NONE = 0,
    BARELINK = 1,
    FOOTREF = 2,
    NORMAL = 3,
    FOOTNOTE = 4,
    MAYBE_FOOTNOTE_URL = 5,
    BARELINK2 = 6,
    FOOTREF2 = 7
}
