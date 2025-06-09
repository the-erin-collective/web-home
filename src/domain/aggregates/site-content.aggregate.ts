import { Site } from '../entities/site/site.entity';
import { Page } from '../entities/page/page.entity';

// This class represents the aggregate of Site and its associated Pages.
export class SiteContent {
  constructor(
    public readonly site: Site,
    public readonly pages: Page[],
  ) {}
}