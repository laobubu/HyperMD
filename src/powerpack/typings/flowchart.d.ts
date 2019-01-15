declare module "flowchart.js" {
  class Diagram {
    drawSVG(containerID: string | HTMLElement, options?: any): void
    clean(): void

    symbols: Record<string, any>
  }

  export function parse(text: string): Diagram
}
