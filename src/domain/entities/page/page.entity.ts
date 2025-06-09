import { RootNode } from './root.entity';
import { ContentNode } from './content.entity.interface';
import { Style } from '../style/style.entity';

export class Page {
  constructor(
    public id: string,
    public title: string,
    public root: RootNode,
    public siteId: string,
    public styles?: Style['properties']
  ) {}

  // Add getter for _id to maintain compatibility
  get _id(): string {
    return this.id;
  }

  static fromJSON(json: {
    id?: string;
    _id?: string;
    title: string;
    root: {
      base: { children?: ContentNode[] };
      core: { children?: ContentNode[] };
      preview: { children?: ContentNode[] };
      script: { children?: ContentNode[] };
      type: string;
    };
    siteId: string;
    styles?: Style['properties'];
  }): Page {
    const id = json.id || json._id;
    if (!id) {
      throw new Error('Page must have either id or _id');
    }
    return new Page(
      id,
      json.title,
      RootNode.fromJSON(json.root),
      json.siteId,
      json.styles
    );
  }

  toJSON(): {
    _id: string;
    title: string;
    root: {
      base: { children?: ContentNode[] };
      core: { children?: ContentNode[] };
      preview: { children?: ContentNode[] };
      script: { children?: ContentNode[] };
      type: string;
    };
    siteId: string;
    styles?: Style['properties'];
  } {
    return {
      _id: this.id, 
      title: this.title,
      root: this.root.toJSON(),
      siteId: this.siteId,
      styles: this.styles
    };
  }
}
