declare class TurndownService {
  constructor(opts?: object);
  turndown(html: string): string;
  use(plugin: any): void;
}

declare module TurndownService {
}

declare const turndownPluginGfm

declare module "turndown" {
  export = TurndownService
}
