import { Injectable } from '@angular/core';
import { Scene, MeshBuilder, Mesh, StandardMaterial, Texture, ArcRotateCamera, HemisphericLight, Vector3 } from '@babylonjs/core';
import * as honeycomb from 'honeycomb-grid';
import { SiteContent } from '../../models/site-content.aggregate.model';
import { Page } from 'src/domain/entities/page/page.entity';
import { GuiService } from './gui.service';
import { SitemapType } from 'src/domain/entities/site/sitemap-type.enum';
import { NavigationService } from '../navigation/navigation.service';
import { RootNode } from 'src/domain/entities/page/root.entity';
import { BackdropService } from './backdrop.service';

@Injectable({ providedIn: 'root' })
export class PageLayoutService {
  material: StandardMaterial;
  constructor(
    private guiService: GuiService,
    private navigationService: NavigationService,
    private backdropService: BackdropService
  ) {}

  async renderGrid(scene: Scene, siteContent: SiteContent | null): Promise<void> {
    if (!siteContent?.site) {
      console.warn('No site content available to render.');
      return;
    }

    const pages = siteContent.pages || [];
    if (pages.length === 0) {
      console.warn('No pages available to render.');
      return;
    }

    // Add a hemispheric light to the scene
    new HemisphericLight('light', new Vector3(0, 1, 0), scene);
    console.log('Added HemisphericLight to the scene.');

    // Apply the site backdrop
    this.backdropService.applyBackdrop(scene, siteContent.site.backdrop);

    // Conditionally create material based on site's backgroundType or borderType
    if (siteContent.site.styles?.backgroundType === 'material' || siteContent.site.styles?.borderType === 'material') {
      console.log(`RenderGrid: Creating scene material with type=${siteContent.site.styles?.materialType}, texture=${siteContent.site.styles?.materialTextureUrl} because backgroundType or borderType is 'material'.`);
      this.material = this.createMaterial(
        scene,
        siteContent.site.styles?.materialType,
        siteContent.site.styles?.materialTextureUrl
      );
    } else {
      console.log(`RenderGrid: Creating transparent scene material because backgroundType and borderType are not 'material'.`);
      this.material = new StandardMaterial('transparent_surface', scene);
      this.material.alpha = 0; // Make it fully transparent
      this.material.diffuseTexture = null; // Ensure no texture is applied
    }
    
    this.guiService.initializeGui(scene);

    // Initialize navigation service with pages
    this.navigationService.initialize(scene, scene.activeCamera as ArcRotateCamera, pages);

    switch (siteContent.site.sitemapType) {
      case SitemapType.HEX_FLOWER:
        await this.renderHexFlower(scene, pages, siteContent.site.defaultPage, siteContent);
        break;
      case SitemapType.GRID:
        await this.renderGridLayout(scene, pages, siteContent.site.defaultPage, siteContent);
        break;
      case SitemapType.LIST:
        await this.renderListLayout(scene, pages, siteContent.site.defaultPage, siteContent);
        break;
      default:
        console.warn(`Unsupported sitemap type: ${siteContent.site.sitemapType}`);
        await this.renderHexFlower(scene, pages, siteContent.site.defaultPage, siteContent);
    }
  }

  private async renderHexFlower(scene: Scene, pages: Page[], defaultPageId?: string, siteContent?: SiteContent | null): Promise<void> {
    console.log('Rendering hex flower with pages:', pages.map(p => ({ id: p._id, title: p.title })));
    
    const grid = this.createGrid();
    let pageIndex = 0;
    
    for (const hex of grid) {
      if (pageIndex >= pages.length) {
        console.warn(`No more pages available for hex at position (${hex.q}, ${hex.r})`);
        break;
      }

      const page = pages[pageIndex];
      console.log(`Creating hex for page ${pageIndex}:`, { 
        pageId: page._id, 
        pageTitle: page.title,
        hex: { q: hex.q, r: hex.r } 
      });
      
      if (!page._id) {
        console.error('Page ID is undefined for page:', page);
        continue;
      }
      
      const hexMesh = this.createHexMesh(hex, scene, this.material, page._id);
      
      // Store the page ID in the mesh metadata
      hexMesh.metadata = { pageId: page._id };
      console.log(`Stored page ID in mesh metadata:`, hexMesh.metadata);

      // If site has a material border, create a separate border mesh
      if (siteContent?.site?.styles?.borderType === 'material') {
        const borderMaterial = this.createMaterial(
          scene,
          siteContent.site.styles?.materialType,
          siteContent.site.styles?.materialTextureUrl
        );
        // Create a slightly larger hex cylinder for the border
        const borderMesh = MeshBuilder.CreateCylinder(`hex_border_${hex.q}_${hex.r}_page_${page._id}`, {
          diameter: 62.0, // Slightly larger diameter
          height: 0.15,  // Slightly thicker to stand out
          tessellation: 6,
        }, scene);

        borderMesh.material = borderMaterial;
        borderMesh.position.x = hex.x;
        borderMesh.position.z = hex.y;
        borderMesh.position.y = -0.05; // Slightly below the main hex
        borderMesh.isPickable = false; // Border should not be pickable
        console.log(`  Created material border for hex mesh: ${borderMesh.name}, Material Name: ${borderMaterial.name}`);
      }
      
      const guiElements = await this.guiService.createGuiFromJson(page.root, page.styles);
      if (guiElements) {
        // Store both preview and core content in the mesh's GUI
        this.guiService.attachGuiToMesh(hexMesh, guiElements);
      }
      pageIndex++;
    }

    // If there's a default page, navigate to it
    if (defaultPageId) {
      console.log('Looking for default page:', defaultPageId);
      const defaultPage = pages.find(p => p._id === defaultPageId);
      if (defaultPage) {
        console.log('Found default page:', defaultPage);
        const defaultMesh = scene.meshes.find(mesh => {
          const meshPageId = mesh.metadata?.pageId;
          console.log('Checking mesh:', mesh.name, 'metadata:', mesh.metadata);
          return meshPageId === defaultPageId;
        });
        if (defaultMesh) {
          console.log('Found default mesh:', defaultMesh.name);
          await this.navigationService.navigateToPage(defaultPage, defaultMesh);
        } else {
          console.warn('Default mesh not found for page:', defaultPageId);
        }
      } else {
        console.warn('Default page not found:', defaultPageId);
      }
    }
  }

  private async renderGridLayout(scene: Scene, pages: Page[], defaultPageId?: string, siteContent?: SiteContent | null): Promise<void> {
    const gridSize = Math.ceil(Math.sqrt(pages.length));
    const spacing = 70;
    
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const row = Math.floor(i / gridSize);
      const col = i % gridSize;
      
      const mesh = MeshBuilder.CreateBox(`page_${page.id}`, {
        height: 0.5, // Increased height for better visibility
        width: 60,
        depth: 60
      }, scene);
      
      mesh.material = this.material;
      console.log(`  Applying material to grid mesh: ${mesh.name}, Material Name: ${this.material.name}, Has Diffuse Texture: ${!!this.material.diffuseTexture}`);
      mesh.position.x = (col - gridSize/2) * spacing;
      mesh.position.z = (row - gridSize/2) * spacing;

      // If site has a material border, create a separate border mesh
      if (siteContent?.site?.styles?.borderType === 'material') {
        const borderMaterial = this.createMaterial(
          scene,
          siteContent.site.styles?.materialType,
          siteContent.site.styles?.materialTextureUrl
        );
        // Create a slightly larger box for the border
        const borderMesh = MeshBuilder.CreateBox(`box_border_${page.id}`, {
          height: 0.15, // Slightly thicker
          width: 62,   // Slightly larger
          depth: 62
        }, scene);

        borderMesh.material = borderMaterial;
        borderMesh.position.x = mesh.position.x;
        borderMesh.position.z = mesh.position.z;
        borderMesh.position.y = -0.05; // Slightly below the main box
        borderMesh.isPickable = false;
        console.log(`  Created material border for grid mesh: ${borderMesh.name}, Material Name: ${borderMaterial.name}`);
      }
      
      const guiElement = await this.guiService.createGuiFromJson(page.root, page.styles);
      if (guiElement) {
        this.guiService.attachGuiToMesh(mesh, guiElement);
      }
    }

    // If there's a default page, navigate to it
    if (defaultPageId) {
      const defaultPage = pages.find(p => p.id === defaultPageId);
      if (defaultPage) {
        const defaultMesh = scene.getMeshByName(`page_${defaultPage.id}`);
        if (defaultMesh) {
          await this.navigationService.navigateToPage(defaultPage, defaultMesh);
        }
      }
    }
  }

  private async renderListLayout(scene: Scene, pages: Page[], defaultPageId?: string, siteContent?: SiteContent | null): Promise<void> {
    const spacing = 70;
    
    for (let i = 0; i < pages.length; i++) {
      const page = pages[i];
      const mesh = MeshBuilder.CreateBox(`page_${page.id}`, {
        height: 0.5, // Increased height for better visibility
        width: 60,
        depth: 60
      }, scene);
      
      mesh.material = this.material;
      console.log(`  Applying material to list mesh: ${mesh.name}, Material Name: ${this.material.name}, Has Diffuse Texture: ${!!this.material.diffuseTexture}`);
      mesh.position.x = 0;
      mesh.position.z = i * spacing;

      // If site has a material border, create a separate border mesh
      if (siteContent?.site?.styles?.borderType === 'material') {
        const borderMaterial = this.createMaterial(
          scene,
          siteContent.site.styles?.materialType,
          siteContent.site.styles?.materialTextureUrl
        );
        // Create a slightly larger box for the border
        const borderMesh = MeshBuilder.CreateBox(`box_border_${page.id}`, {
          height: 0.15, // Slightly thicker
          width: 62,   // Slightly larger
          depth: 62
        }, scene);

        borderMesh.material = borderMaterial;
        borderMesh.position.x = mesh.position.x;
        borderMesh.position.z = mesh.position.z;
        borderMesh.position.y = -0.05; // Slightly below the main box
        borderMesh.isPickable = false;
        console.log(`  Created material border for list mesh: ${borderMesh.name}, Material Name: ${borderMaterial.name}`);
      }
      
      const guiElement = await this.guiService.createGuiFromJson(page.root, page.styles);
      if (guiElement) {
        this.guiService.attachGuiToMesh(mesh, guiElement);
      }
    }

    // If there's a default page, navigate to it
    if (defaultPageId) {
      const defaultPage = pages.find(p => p.id === defaultPageId);
      if (defaultPage) {
        const defaultMesh = scene.getMeshByName(`page_${defaultPage.id}`);
        if (defaultMesh) {
          await this.navigationService.navigateToPage(defaultPage, defaultMesh);
        }
      }
    }
  }

  private createGrid(): honeycomb.Grid<honeycomb.Hex> {
    const gridSize = 2;
    const gridDimensions = 30;

    const defaultHexSettings: honeycomb.HexSettings = {
      dimensions: { xRadius: gridDimensions, yRadius: gridDimensions },
      orientation: honeycomb.Orientation.FLAT,
      origin: { x: 0, y: 0 },
      offset: -1,
    };

    const tile = honeycomb.defineHex(defaultHexSettings);

    return new honeycomb.Grid(
      tile,
      honeycomb.spiral({ start: [0, 0], radius: gridSize })
    );
  }

  private createHexMesh(hex: honeycomb.Hex, scene: Scene, material: StandardMaterial, pageId: string): Mesh {
    if (!pageId) {
      console.error('Attempting to create hex mesh with undefined pageId');
      pageId = 'unknown'; // Fallback to prevent undefined in mesh name
    }

    const meshName = `hex_${hex.q}_${hex.r}_page_${pageId}`;
    console.log('Creating hex mesh:', meshName);
    
    const hexMesh = MeshBuilder.CreateCylinder(meshName, {
      diameter: 60.0, 
      height: 0.5, // Increased height for better visibility
      tessellation: 6,
    }, scene);

    hexMesh.material = material;
    console.log(`  Applying material to hex mesh: ${hexMesh.name}, Material Name: ${material.name}, Has Diffuse Texture: ${!!material.diffuseTexture}`);
    hexMesh.position.x = hex.x;
    hexMesh.position.z = hex.y;
    hexMesh.position.y = 0;

    // Store the page ID in the mesh metadata
    hexMesh.metadata = { pageId };
    console.log(`Created hex mesh with metadata:`, hexMesh.metadata);

    return hexMesh;
  }

  createMaterial(scene: Scene, materialType?: string, materialTextureUrl?: string): StandardMaterial {
    console.log(`Creating material: type=${materialType}, texture=${materialTextureUrl}`);
    const material = new StandardMaterial('hex_surface', scene);
    material.specularPower = 50; // Reduced specular power for better texture visibility

    let effectiveMaterialType = materialType || 'concrete'; // Default to 'concrete'
    let effectiveTextureUrl = materialTextureUrl; // Start with provided texture URL

    console.log(`  Initial material properties: type=${materialType}, texture=${materialTextureUrl}`);

    if (effectiveMaterialType === 'concrete') {
      effectiveTextureUrl = effectiveTextureUrl || 'src/presentation/assets/textures/light-concrete.jpg';
      console.log('  Determined material type: concrete. Using concrete properties.');
    } else if (effectiveMaterialType === 'wood') {
      effectiveTextureUrl = effectiveTextureUrl || 'src/presentation/assets/textures/light-wood-boards.jpg';
      console.log('  Determined material type: wood. Using wood properties.');
    } else {
      // If materialType is specified but not recognized, default to concrete
      effectiveMaterialType = 'concrete';
      effectiveTextureUrl = effectiveTextureUrl || 'src/presentation/assets/textures/light-concrete.jpg';
      console.warn(`  Unrecognized material type: ${materialType}. Defaulting to concrete.`);
    }

    // Ensure a texture URL is always set
    if (!effectiveTextureUrl) {
      effectiveTextureUrl = 'src/presentation/assets/textures/light-concrete.jpg';
      console.warn(`  No effective texture URL determined. Defaulting to light-concrete.jpg.`);
    }

    material.diffuseTexture = new Texture(effectiveTextureUrl, scene);
    console.log(`  Final material properties: Effective Type=${effectiveMaterialType}, Effective Texture URL=${effectiveTextureUrl}, Diffuse Texture Set: ${!!material.diffuseTexture}`);
    return material;
  }
}