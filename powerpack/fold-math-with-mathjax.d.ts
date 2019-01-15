declare global {
    const MathJax: any;
}
import 'mathjax';
import { MathRenderer, MathRenderMode } from '../addon/fold-math';
export declare class MathJaxRenderer implements MathRenderer {
    div: HTMLElement;
    mode: MathRenderMode;
    onChanged: (expr: string) => void;
    jax: any;
    script: HTMLScriptElement;
    private _cleared;
    private _renderingExpr;
    constructor(div: HTMLElement, mode: MathRenderMode);
    clear(): void;
    startRender(expr: string): void;
    /** Callback for MathJax when typeset is done*/
    private _TypesetDoneCB;
    isReady(): any;
}
