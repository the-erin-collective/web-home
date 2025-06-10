import { SiteBackdrop } from './backdrop.enum';
import { SitemapType } from './sitemap-type.enum';
import { Style } from '../style/style.entity';

export interface SiteStyles {
  backgroundType?: Style['properties']['backgroundType'];
  materialType?: Style['properties']['materialType'];
  materialTextureUrl?: Style['properties']['materialTextureUrl'];
  borderType?: Style['properties']['borderType'];
}

export class Site {    constructor(
      public id: string,
      public name: string,
      public description?: string,
      public pageOrder: string[] = [],
      public sitemapType: SitemapType = SitemapType.HEX_FLOWER,
      public defaultPage?: string,
      public backdrop?: string,
      public styles?: SiteStyles
    ) {}
    static fromJSON(json: {
      id: string;
      name: string;
      description?: string;
      pageOrder?: string[];      sitemapType?: SitemapType;
      defaultPage?: string;
      backdrop?: string;
      styles?: SiteStyles;
    }): Site {
      const siteStyles: SiteStyles = {
        backgroundType: json.styles?.backgroundType,
        materialType: json.styles?.materialType,
        materialTextureUrl: json.styles?.materialTextureUrl,
        borderType: json.styles?.borderType,
      };

      return new Site(
        json.id,
        json.name,
        json.description,
        json.pageOrder ?? [],
        json.sitemapType ?? SitemapType.HEX_FLOWER,
        json.defaultPage,
        json.backdrop,
        siteStyles
      );
    }
  
    toJSON(): Record<string, unknown> {
      return {
        _id: this.id,
        name: this.name,
        description: this.description,
        pageOrder: this.pageOrder,
        sitemapType: this.sitemapType,
        defaultPage: this.defaultPage,
        backdrop: this.backdrop,
        styles: this.styles
      };
    }
  }