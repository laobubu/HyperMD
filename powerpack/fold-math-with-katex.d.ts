import { MathRenderer, MathRenderMode } from '../addon/fold-math';
import 'katex/dist/katex.min.css';
export declare class KatexRenderer implements MathRenderer {
    container: HTMLElement;
    private isDisplay;
    private el;
    private errorEl;
    constructor(container: HTMLElement, mode: MathRenderMode);
    startRender(expr: string): void;
    clear(): void;
    /** a callback function, called when a rendering work is done */
    onChanged: (expr: string) => void;
    /** indicate that if the Renderer is ready to execute */
    isReady(): boolean;
}
