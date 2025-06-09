import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  ElementRef,
  Input,
  OnChanges,
  SimpleChanges,
  ViewChild,
  ViewEncapsulation,
  Inject,
  PLATFORM_ID,
} from '@angular/core';
import { EngineService } from '../../../integration/engine/engine.service';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { SiteContent } from '../../../integration/models/site-content.aggregate.model';

@Component({
  selector: 'app-platform',
  standalone: true,
  encapsulation: ViewEncapsulation.None,
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './platform.component.html',
  styleUrl: './platform.component.scss',
  imports: [CommonModule],
})
export class PlatformComponent implements OnChanges {
  @ViewChild('rendererCanvas', { static: false })
  public rendererCanvas: ElementRef<HTMLCanvasElement>;

  @Input() initializeEngine: boolean = false; // Input to trigger initialization
  @Input() siteContent: SiteContent | null = null; // Input to receive site content

  public isBabylonJsAvailable = false;

  constructor(
    private engServ: EngineService,
    @Inject(PLATFORM_ID) private platformId: object,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    console.log('EngineComponent - ngOnChanges triggered:', changes);

    if (changes['initializeEngine'] && changes['initializeEngine'].currentValue) {
      if (isPlatformBrowser(this.platformId)) {
        this.isBabylonJsAvailable = true;
        this.cdr.detectChanges(); // Ensure the DOM updates
        setTimeout(() => this.StartEngine(), 0); // Wait for the DOM to update
      } else {
        console.log('EngineComponent - Skipping Babylon.js initialization on the server');
      }
    }

    if (changes['siteContent'] && changes['siteContent'].currentValue) {
      // Initialize the styles object if it doesn't exist
      if (!this.siteContent.site.styles) {
        this.siteContent.site.styles = {};
      }
      this.siteContent.site.styles.backgroundType = 'material'; 
      this.siteContent.site.styles.materialType = 'wood';
      
      this.siteContent.pages.forEach(page => {
        console.log('page styles:', page.styles);
        // Initialize the styles object on each page if it doesn't exist
        if (!page.styles) {
          page.styles = {};
        }
        page.styles.backgroundType = 'material';
        page.styles.materialType = 'wood';
      });

      console.log('EngineComponent - Received site content:', this.siteContent);
      // Perform any logic with the site content here
    }
  }

  private StartEngine(): void {
    console.log('Starting Babylon.js engine...');

    this.isBabylonJsAvailable = isPlatformBrowser(this.platformId);

    if (this.isBabylonJsAvailable && this.rendererCanvas) {
      this.engServ.initializeEngine(this.rendererCanvas, this.siteContent); // Pass site content to the engine
    } else {
      console.warn('EngineComponent - Renderer canvas or babylonjs is not available');
    }
  }
}
