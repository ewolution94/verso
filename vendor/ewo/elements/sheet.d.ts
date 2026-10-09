import { EwoElement } from './base';
export declare class EwoSheet extends EwoElement {
    #private;
    static styles: CSSStyleSheet[];
    static observedAttributes: string[];
    constructor();
    connectedCallback(): void;
    disconnectedCallback(): void;
    attributeChangedCallback(name: string): void;
    get open(): boolean;
    set open(v: boolean);
    show(): void;
    close(): void;
}
declare global {
    interface HTMLElementTagNameMap {
        'ewo-sheet': EwoSheet;
    }
}
