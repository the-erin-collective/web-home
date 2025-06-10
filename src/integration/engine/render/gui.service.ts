import { Injectable } from '@angular/core';
import { AdvancedDynamicTexture, Rectangle, TextBlock, Control, StackPanel } from '@babylonjs/gui';
import { Scene, Mesh, Animation } from '@babylonjs/core';
import { ElementNode } from 'src/domain/entities/page/element.entity.interface';
import { RootNode } from 'src/domain/entities/page/root.entity';
import { ContentNode } from 'src/domain/entities/page/content.entity.interface';
import { CoreNode } from 'src/domain/entities/page/containers/core.entity';
import { PreviewNode } from 'src/domain/entities/page/containers/preview.entity';
import { EmbeddableContainerNode } from 'src/domain/entities/page/content/embeddable-container.entity';
import { TextNode } from 'src/domain/entities/page/content/items/text.entity';
import { StyleService } from 'src/integration/engine/render/style.service';
import { StylesheetNode } from 'src/domain/entities/page/content/items/stylesheet.entity';
import { Style } from 'src/domain/entities/style/style.entity';

@Injectable({ providedIn: 'root' })
export class GuiService {
  private guiTexture: AdvancedDynamicTexture;
  private meshGuiMap: Map<string, { preview: Control; core: Control }> = new Map();
  private stylesheetMap: Map<string, any> = new Map();

  constructor(private styleService: StyleService) {}

  initializeGui(scene: Scene): void {
    this.guiTexture = AdvancedDynamicTexture.CreateFullscreenUI('UI', true, scene);
    console.log('GUI initialization completed.');
  }

  attachGuiToMesh(mesh: Mesh, guiElements: { preview: Control; core: Control }): void {
    console.log(`Attaching GUI to mesh: ${mesh.name}`, guiElements);
    const advancedTexture = AdvancedDynamicTexture.CreateForMesh(
      mesh,
      1024, // width
      1024, // height
      true // generateMipMaps
    );
    
    // Set appropriate scaling - found a better value after testing
    advancedTexture.rootContainer.scaleX = 1.0;
    advancedTexture.rootContainer.scaleY = 1.0;
    
    // Preserve the existing mesh metadata
    if (mesh.metadata) {
      console.log(`Preserving mesh metadata for ${mesh.name}:`, mesh.metadata);
    }
    
    // Set initial states
    guiElements.preview.alpha = 1;
    guiElements.core.alpha = 0;
    
    // Add both controls to the texture
    advancedTexture.addControl(guiElements.preview);
    advancedTexture.addControl(guiElements.core);
    
    // Store the controls in our map
    this.meshGuiMap.set(mesh.name, guiElements);
    
    // Debug the full hierarchy
    this.logControlHierarchy(guiElements.preview);
    this.logControlHierarchy(guiElements.core);
  }
  async createGuiFromJson(node: ElementNode, pageStyles?: Style['properties']): Promise<{ preview: Control; core: Control } | null> {
    if (!node || !node.type || node.type !== 'root') {
      console.warn('Invalid root node:', node);
      return null;
    }    const rootNode = node as RootNode;
    console.log('Creating GUI from root node');    
    
    // Find and store the stylesheet    
    const stylesheetNodeFound = rootNode.base.children.find(child => child.type === 'stylesheet') as StylesheetNode;
    if (stylesheetNodeFound) {
      // IMPORTANT: Don't clear previous styles to maintain hover styles for all pages
      // this.stylesheetMap.clear(); 
      stylesheetNodeFound.styles.forEach(style => {
        this.stylesheetMap.set(style._id, style);
        console.log(`Added style to map: ${style._id}`);
      });
      
      // Log all keys in the stylesheetMap for debugging
      console.log('Current styles in stylesheetMap:', Array.from(this.stylesheetMap.keys()));
    }

    // Create preview and core containers
    const previewContainer = await this.createContainer(rootNode.preview, pageStyles);
    const coreContainer = await this.createContainer(rootNode.core, pageStyles);
    
    // Make a final pass to ensure text alignment consistency in both containers
    this.ensureConsistentTextAlignment(previewContainer);
    this.ensureConsistentTextAlignment(coreContainer);
    
    // Log the final hierarchy of both containers
    console.log('Preview container final hierarchy:');
    this.logControlHierarchy(previewContainer);
    console.log('Core container final hierarchy:');
    this.logControlHierarchy(coreContainer);

    // Initially hide the core content
    if (coreContainer) {
      coreContainer.isVisible = false;
    }

    return {
      preview: previewContainer,
      core: coreContainer
    };
  }

  showCoreContent(mesh: Mesh): void {
    const guiElements = this.meshGuiMap.get(mesh.name);
    if (guiElements) {
      // Create animations for both controls
      const previewAnimation = new Animation(
        "previewFade",
        "alpha",
        30,
        Animation.ANIMATIONTYPE_FLOAT,
        Animation.ANIMATIONLOOPMODE_CONSTANT
      );
      
      const coreAnimation = new Animation(
        "coreFade",
        "alpha",
        30,
        Animation.ANIMATIONTYPE_FLOAT,
        Animation.ANIMATIONLOOPMODE_CONSTANT
      );
      
      // Set keyframes
      previewAnimation.setKeys([
        { frame: 0, value: 1 },
        { frame: 30, value: 0 }
      ]);
      
      coreAnimation.setKeys([
        { frame: 0, value: 0 },
        { frame: 30, value: 1 }
      ]);
      
      // Attach animations to controls
      guiElements.preview.animations = [previewAnimation];
      guiElements.core.animations = [coreAnimation];
      
      // Start animations
      const scene = mesh.getScene();
      scene.beginAnimation(guiElements.preview, 0, 30, false, undefined, () => {
        guiElements.preview.isVisible = false; // Hide preview after fade out
      });
      scene.beginAnimation(guiElements.core, 0, 30);
    }
  }

  showPreviewContent(mesh: Mesh): void {
    const guiElements = this.meshGuiMap.get(mesh.name);
    if (guiElements) {
      // Ensure preview is visible before fading in
      guiElements.preview.isVisible = true;

      // Create animations for both controls
      const previewAnimation = new Animation(
        "previewFade",
        "alpha",
        30,
        Animation.ANIMATIONTYPE_FLOAT,
        Animation.ANIMATIONLOOPMODE_CONSTANT
      );
      
      const coreAnimation = new Animation(
        "coreFade",
        "alpha",
        30,
        Animation.ANIMATIONTYPE_FLOAT,
        Animation.ANIMATIONLOOPMODE_CONSTANT
      );
      
      // Set keyframes
      previewAnimation.setKeys([
        { frame: 0, value: 0 },
        { frame: 30, value: 1 }
      ]);
      
      coreAnimation.setKeys([
        { frame: 0, value: 1 },
        { frame: 30, value: 0 }
      ]);
      
      // Attach animations to controls
      guiElements.preview.animations = [previewAnimation];
      guiElements.core.animations = [coreAnimation];
      
      // Start animations
      const scene = mesh.getScene();
      scene.beginAnimation(guiElements.preview, 0, 30);
      scene.beginAnimation(guiElements.core, 0, 30, false, undefined, () => {
        guiElements.core.isVisible = false; // Hide core after fade out
      });
    }
  }
    // Helper to compute effective style by walking up the site data tree (root-to-leaf order), handling 'inherit' by propagating parent value
  private computeEffectiveStyle(node: ElementNode, stylesheetMap: Map<string, any>): any {
    // Build the ancestor chain from root to this node
    const chain: ElementNode[] = [];
    let current: any = node;
    while (current) {
      chain.unshift(current);
      current = current.parent;
    }
    // For each property, use the closest non-'inherit' value from root to leaf
    let effectiveStyle = {};
    const seenKeys = new Set<string>();
    for (const n of chain) {
      if (n._id) {
        const style = stylesheetMap.get(n._id);
        if (style) {
          for (const key of Object.keys(style)) {
            const value = style[key];
            // Only set if not already set (closest to leaf wins), and not 'inherit'
            if (!seenKeys.has(key) && value !== 'inherit') {
              effectiveStyle[key] = value;
              seenKeys.add(key);
            }
          }
        }
      }
    }
    return effectiveStyle;
  }
  
  // Helper to ensure text alignment is consistent for all controls in a container
  private ensureConsistentTextAlignment(control: Control): void {
    // For TextBlocks, ensure textHorizontalAlignment matches horizontalAlignment
    if (control instanceof TextBlock) {
      if (control.horizontalAlignment === Control.HORIZONTAL_ALIGNMENT_CENTER) {
        control.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
      }
      if (control.verticalAlignment === Control.VERTICAL_ALIGNMENT_CENTER) {
        control.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
      }
    }
    
    // For containers with children, recursively apply alignment
    if ('children' in control && Array.isArray((control as any).children)) {
      const children = (control as any).children;
      children.forEach((child: Control) => {
        this.ensureConsistentTextAlignment(child);
      });
    }
  }  private async createTextBlock(node: ElementNode, fontSize: number, fontWeight: string, parentPanelSize?: { width: number; height: number }, inheritedStyles?: Style['properties']): Promise<TextBlock> {
    console.log(`Creating text block for type: ${node.type}`);
    const textBlock = new TextBlock(node.type);
    console.log(`  TextBlock initial properties for ${node.type}: color='${textBlock.color}', alpha=${textBlock.alpha}'`);
    
    // Ensure text is never clipped by its container
    textBlock.clipContent = false;
    textBlock.color = 'black'; // Explicitly set text color
    textBlock.alpha = 1; // Explicitly set text opacity
    
    // Set content first so we can calculate sizes based on content
    if ('text' in node && typeof node.text === 'string') {
      textBlock.text = node.text;
      console.log(`Text content for ${node.type}: "${textBlock.text}"`);
    } else {
      textBlock.text = node.type === 'h1' ? 'Header' : 'Text content';
    }
    
    // Set parent chain for style inheritance
    const styleChain = this.styleService.getStyleChain(node, this.stylesheetMap);
    
    // Prioritize inherited styles over stylesheet styles
    const effectiveInheritedStyles: Style[] = inheritedStyles ? [{ _id: 'inherited-text-style', name: 'Inherited Text Style', properties: inheritedStyles }] : [];
    const stylesToApply = [...effectiveInheritedStyles, ...styleChain];

    this.styleService.applyStyles(textBlock, stylesToApply);
    
    // Different configuration based on text type
    if (node.type === 'h1') {
      // For headings: Allow horizontal growth if needed
      textBlock.resizeToFit = true;
      textBlock.textWrapping = false;
      if (parentPanelSize) {
        textBlock.width = parentPanelSize.width + 'px';
        // Fixed height for headings - more predictable
        textBlock.height = (fontSize * 3) + 'px';
      }
      
      // Extra padding for headings
      textBlock.paddingTop = "10px";
      textBlock.paddingBottom = "10px";
      
    } else {
      // For paragraphs: Enable wrapping and calculate height based on content
      textBlock.resizeToFit = false;
      textBlock.textWrapping = true;
      
      if (parentPanelSize) {
        textBlock.width = parentPanelSize.width + 'px';
          // Count the number of lines (rough estimate based on width and text length)
        const textLength = textBlock.text.length;
        // Use a much more conservative avgCharsPerLine calculation with very generous overhead
        // We'd rather have too much space than too little
        const avgCharsPerLine = Math.floor(parentPanelSize.width / (fontSize * 0.5)); // More conservative estimate (reduced from 0.6)        // Calculate estimated lines based on text length with a reasonable factor
        // Use a moderate divisor to avoid underestimating lines
        const estimatedLinesBase = Math.ceil(textLength / Math.max(1, avgCharsPerLine * 0.65));
          // Use a smart scaling factor that handles specific cases differently
        // For longer text that likely has 3+ lines, be more generous to ensure no cutoff
        // For shorter text, use minimal scaling to avoid wasting space
        const scalingFactor = 
          textLength > 800 ? 1.5 :  // Very long text gets 1.5x multiplier
          textLength > 500 ? 1.3 :  // Long text gets 1.3x multiplier
          textLength > 300 ? 1.2 :  // Medium-long text gets 1.2x multiplier
          textLength > 150 ? 1.1 :  // Medium text gets 1.1x multiplier
          1.0;                      // Short text gets no multiplier
          
        // For text that might be on the border of 2-3 lines, add a special check
        // This specifically targets the original problem case of 3+ lines being cut off
        const estimatedLineCount = Math.ceil(textLength / avgCharsPerLine);
        const needsExtraSpace = estimatedLineCount >= 3;
          const estimatedLines = Math.max(
          3, // Reasonable minimum for short text
          Math.ceil(estimatedLinesBase * scalingFactor) // Apply our scaling factor
        );
        
        // Use a reasonable line height multiplier for proper spacing
        const lineHeight = fontSize * 1.4; // Moderate multiplier for proper line spacing
          // Use reasonable padding that scales modestly with text length
        // For longer text, add some extra padding to prevent cutoffs
        const basePadding = 20; // Start with a reasonable base padding
        
        // Give extra padding specifically to text that likely has 3+ lines (our problem case)
        // This ensures we fix the original issue without making single lines too tall
        const lineSpecificPadding = needsExtraSpace ? 25 : 0;
        
        const extraPadding = Math.min(40, estimatedLines * 2); // Scale padding with line count, but with a reasonable cap
        const totalPadding = basePadding + extraPadding + lineSpecificPadding;
        
        const calculatedHeight = (estimatedLines * lineHeight) + totalPadding;        // Set a fixed height based on our calculations, with a reasonable minimum size
        // Balance between having enough space without excessive height
        const minimumHeight = Math.max(
          fontSize * 3, // Reasonable minimum height for single-line content
          calculatedHeight * 1.05 // Add a small 5% safety margin to calculated height
        );
        
        textBlock.height = Math.ceil(minimumHeight) + 'px';
        
        console.log(`Enhanced paragraph height calculation: fontSize=${fontSize}, chars=${textLength}, ` +
                    `avgCharsPerLine=${avgCharsPerLine}, estimatedLines=${estimatedLines}, ` +
                    `calculatedHeight=${calculatedHeight}, finalHeight=${textBlock.height}`);
      }
      
      // Extra padding for paragraphs
      textBlock.paddingTop = "15px"; // Increased padding
      textBlock.paddingBottom = "15px"; // Increased padding
      textBlock.paddingLeft = "10px";
      textBlock.paddingRight = "10px";
    }
    
    // Force alignment consistency between the control position and text position
    if (textBlock.horizontalAlignment === Control.HORIZONTAL_ALIGNMENT_CENTER) {
      textBlock.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
    }
    if (textBlock.verticalAlignment === Control.VERTICAL_ALIGNMENT_CENTER) {
      textBlock.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
    }
    
    // Log configuration for debugging
    console.log(`TextBlock ${node.type} configuration:`, {
      text: textBlock.text.substring(0, 20) + (textBlock.text.length > 20 ? '...' : ''),
      width: textBlock.width,
      height: textBlock.height,
      textWrapping: textBlock.textWrapping,
      resizeToFit: textBlock.resizeToFit,
      fontSize: textBlock.fontSize,
      paddingTop: textBlock.paddingTop,
      paddingBottom: textBlock.paddingBottom
    });
    
    return textBlock;
  }

  private async createContainer(node: ElementNode, inheritedStyles?: Style['properties']): Promise<Rectangle> {
    console.log(`Creating container for type: ${node.type}`);
    const rect = new Rectangle(node.type);
    // Explicitly set initial properties to transparent/no border to prevent visual artifacts
    rect.background = "transparent"; // Ensure no default background
    rect.alpha = 1; // Start fully opaque for the control itself
    rect.thickness = 0; // Ensure no default border
    rect.color = 'transparent'; // Ensure no default border color

    console.log(`  Rectangle initial properties for ${node.type}: background='${rect.background}', alpha=${rect.alpha}, thickness=${rect.thickness}, color='${rect.color}'`);
    
    // Set parent chain for style inheritance
    const styleChain = this.styleService.getStyleChain(node, this.stylesheetMap);
    
    // Prioritize inherited styles over stylesheet styles
    const effectiveInheritedStyles: Style[] = inheritedStyles ? [{ _id: 'inherited-container-style', name: 'Inherited Container Style', properties: inheritedStyles }] : [];
    const stylesToApply = [...effectiveInheritedStyles, ...styleChain];

    this.styleService.applyStyles(rect, stylesToApply);
    
    // If the node's style has a material background or border, make the GUI rectangle transparent
    // We need to re-evaluate the merged properties to check for material type.
    const mergedProps: Style['properties'] = {};
    for (const style of stylesToApply) {
      Object.assign(mergedProps, style.properties);
    }

    if (mergedProps.backgroundType === 'material' || mergedProps.borderType === 'material') {
      rect.background = "transparent";
      console.log(`Container ${node.type} set to transparent background due to material type. Current background: ${rect.background}, alpha: ${rect.alpha}`);
    } else {
      // Ensure non-material backgrounds are explicitly set if not handled by style service
      rect.background = 'transparent'; // Default to transparent if not material
      rect.alpha = 1; // Ensure container is fully opaque unless specified otherwise
      console.log(`Container ${node.type} set to transparent background. Current background: ${rect.background}, alpha: ${rect.alpha}`);
    }

    // Determine pixel width for this container
    let rectWidth = 800; // Default fallback
    if (typeof rect.width === 'string' && rect.width.endsWith('px')) {
      rectWidth = parseInt(rect.width);
    }
    
    // Handle children
    const children = this.getChildNodes(node);
    if (children && children.length > 0) {
      // Group text nodes in a StackPanel, add non-text children directly
      const textNodes: ElementNode[] = [];
      const otherNodes: ElementNode[] = [];
      for (const childNode of children) {
        if (!isElementNode(childNode)) continue;
        (childNode as any).parent = node;
        if (childNode.type === 'h1' || childNode.type === 'p') {
          textNodes.push(childNode);
        } else {
          otherNodes.push(childNode);
        }
      }
      
      if (textNodes.length > 0) {
        console.log(`Creating StackPanel for ${textNodes.length} text nodes in ${node.type}`);
        const stackPanel = new StackPanel("text-stack");
        stackPanel.isVertical = true;
        stackPanel.clipChildren = false; // Ensure children are never clipped
        
        // Set width for the StackPanel based on container dimensions
        const spWidth = Math.round(rectWidth * 0.95); // 95% of container width
        stackPanel.width = spWidth + 'px';
        
        // Add padding to the StackPanel
        stackPanel.paddingTop = "10px";
        stackPanel.paddingBottom = "10px";
        
        // Center the StackPanel in its parent container
        stackPanel.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
        stackPanel.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;        // Moderate spacing between text elements for better readability without excessive gaps
        stackPanel.spacing = 10;
        
        // Add all text nodes to the StackPanel and calculate total height
        let totalHeight = stackPanel.paddingTop ? parseInt(stackPanel.paddingTop) : 0;
        totalHeight += stackPanel.paddingBottom ? parseInt(stackPanel.paddingBottom) : 0;
        
        // Process each text node
        for (const textNode of textNodes) {
          console.log(`Adding ${textNode.type} to StackPanel`);
          
          // Use appropriate font sizes based on element type
          const fontSize = textNode.type === 'h1' ? 32 : 20;
          
          // Create text block with calculated width from parent StackPanel
          const textBlock = await this.createTextBlock(
            textNode,
            fontSize,
            textNode.type === 'h1' ? 'bold' : 'normal',
            { width: spWidth - 20, height: 0 },
            mergedProps // Pass merged properties as inherited styles
          );
          
          // Center text within the StackPanel
          textBlock.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
          textBlock.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
          
          // Add to total height (block height + spacing)
          if (textBlock.height && typeof textBlock.height === 'string' && textBlock.height.endsWith('px')) {
            totalHeight += parseInt(textBlock.height) + stackPanel.spacing;
          }
          
          stackPanel.addControl(textBlock);
        }        // Set explicit height for the stack panel based on total content height
        // Add moderate extra padding to ensure text is not cut off
        // For multiple text blocks, be slightly more generous with the padding
        const extraPadding = textNodes.length > 1 ? 30 : 20;
        const finalHeight = totalHeight + extraPadding;
        stackPanel.height = finalHeight + 'px';
        
        console.log(`Setting StackPanel height to ${stackPanel.height} based on content (${textNodes.length} text nodes, ${extraPadding}px extra padding)`);
        
        rect.addControl(stackPanel);
      }
      for (const childNode of otherNodes) {
        let childControl: Control | null = null;
        if (childNode.type === 'container' || childNode.type === 'panel') {
          childControl = await this.createContainer(childNode, mergedProps); // Pass merged properties
        }
        if (childControl) {
          rect.addControl(childControl);
        }
      }
    }
    return rect;
  }

  addGuiToScene(guiElement: Control): void {
    console.log('Adding GUI element to scene:', guiElement);
    this.guiTexture.addControl(guiElement);
  }
  
  // Helper function to log the control hierarchy
  private logControlHierarchy(control: Control, level: number = 0): void {
    const indent = '  '.repeat(level);
    console.log(`${indent}Control: ${control.name}, Type: ${control.constructor.name}`);
    
    // If this is a container, log its children
    if ('children' in control && Array.isArray((control as any).children)) {
      const children = (control as any).children;
      children.forEach((child: Control) => {
        this.logControlHierarchy(child, level + 1);
      });
    }
  }

  private getChildNodes(node: ElementNode): ContentNode[] | undefined {
    if (node instanceof CoreNode || node instanceof PreviewNode || node instanceof EmbeddableContainerNode) {
      return node.children;
    } else if ('children' in node && Array.isArray((node as any).children)) {
      return (node as any).children;
    }
    return undefined;
  }

  /**
   * Apply hover style to a mesh by finding the hover style in the stylesheet
   * and applying it to the preview content. For hex meshes, also apply border to the mesh itself.
   */
  applyHoverStyle(mesh: Mesh): void {
    const guiElements = this.meshGuiMap.get(mesh.name);
    if (!guiElements || !guiElements.preview) {
      console.warn(`No GUI elements found for mesh: ${mesh.name}`);
      return;
    }

    // Find the page ID from the mesh metadata
    const pageId = mesh.metadata?.pageId;
    if (!pageId) {
      console.warn(`No pageId in metadata for mesh: ${mesh.name}`);
      return;
    }
    // Extract the index from the page ID (assuming format like 'page-1')
    const pageIndex = parseInt(pageId.split('-')[1]);
    if (isNaN(pageIndex)) {
      console.warn(`Invalid page ID format: ${pageId}`);
      return;
    }

    // Look for the hover style in our stylesheet map
    const hoverStyleId = `panel-preview-hover-${pageIndex}`;
    const hoverStyle = this.stylesheetMap.get(hoverStyleId);
    console.log(`Looking for hover style with ID: ${hoverStyleId}`);

    if (hoverStyle) {
      console.log(`Applying hover style ${hoverStyleId} to mesh ${mesh.name}`);
      // Apply the hover style to the preview panel
      if (guiElements.preview instanceof Rectangle) {
        this.styleService.applyStyles(guiElements.preview, [hoverStyle]);
      } else {
        this.applyStyleToChildren(guiElements.preview, hoverStyle);
      }
      // If this is a hex mesh (name starts with 'hex_'), apply border to mesh itself
      if (mesh.name.startsWith('hex_') && hoverStyle.properties?.borderWidth && hoverStyle.properties?.borderColor) {
        const borderWidthNum = parseInt(hoverStyle.properties.borderWidth);
        if (!isNaN(borderWidthNum) && borderWidthNum > 0) {
          this.styleService.applyHexBorder(mesh, borderWidthNum, hoverStyle.properties.borderColor);
        }
      }
    } else {
      console.warn(`Hover style ${hoverStyleId} not found in stylesheet map`);
    }
  }

  /**
   * Apply normal style to a mesh by finding the normal style in the stylesheet
   * and applying it to the preview content. For hex meshes, also remove the border from the mesh itself.
   */
  applyNormalStyle(mesh: Mesh): void {
    const guiElements = this.meshGuiMap.get(mesh.name);
    if (!guiElements || !guiElements.preview) {
      console.warn(`No GUI elements found for mesh: ${mesh.name}`);
      return;
    }

    // Find the page ID from the mesh metadata
    const pageId = mesh.metadata?.pageId;
    if (!pageId) {
      console.warn(`No pageId in metadata for mesh: ${mesh.name}`);
      return;
    }

    // Extract the index from the page ID (assuming format like 'page-1')
    const pageIndex = parseInt(pageId.split('-')[1]);
    if (isNaN(pageIndex)) {
      console.warn(`Invalid page ID format: ${pageId}`);
      return;
    }
    // Look for the normal style in our stylesheet map
    const normalStyleId = `panel-preview-${pageIndex}`;
    const normalStyle = this.stylesheetMap.get(normalStyleId);
    console.log(`Looking for normal style with ID: ${normalStyleId}`);
    if (normalStyle) {
      console.log(`Applying normal style ${normalStyleId} to mesh ${mesh.name}`);
      if (guiElements.preview instanceof Rectangle) {
        this.styleService.applyStyles(guiElements.preview, [normalStyle]);
      } else {
        this.applyStyleToChildren(guiElements.preview, normalStyle);
      }
      // Remove border from hex mesh if present
      if (mesh.name.startsWith('hex_')) {
        this.styleService.removeHexBorder(mesh);
        mesh.renderOutline = false;
        mesh.outlineWidth = 0;
      }
    } else {
      console.warn(`Normal style ${normalStyleId} not found in stylesheet map`);
    }
  }  /**
   * Applies a style to a mesh's GUI by style ID
   * @param mesh The mesh to apply the style to
   * @param styleId The ID of the style to apply
   */
  applyStyleById(mesh: Mesh, styleId: string): void {
    const guiElements = this.meshGuiMap.get(mesh.name);
    if (!guiElements || !styleId) return;
    
    const style = this.stylesheetMap.get(styleId);
    if (!style) {
      console.warn(`Style with ID ${styleId} not found in stylesheetMap`);
      return;
    }
    
    // We know we're working with the preview panel
    const previewContainer = guiElements.preview;
    if (previewContainer instanceof Rectangle) {
      // Apply the style to the container
      this.styleService.applyStyles(previewContainer, [style]);
      
      // Apply to children recursively
      for (const child of previewContainer._children) {
        this.applyStylesToControl(child, style);
      }
    }
  }
    /**
   * Recursively looks for panels in a container and applies the given style
   */
  private applyStyleToChildren(container: Control, style: any): void {
    if (!container || !style) return;

    // If this is a panel (Rectangle), apply the style directly
    if (container instanceof Rectangle) {
      this.styleService.applyStyles(container, [style]);
    }

    // Recursively search for Rectangle controls to apply style
    if (container instanceof Rectangle || container instanceof StackPanel) {
      // Safely handle the _children property which might be private in some versions
      const children = container["_children"] || [];
      for (const child of children) {
        this.applyStyleToChildren(child, style);
      }
    }
  }
  
  /**
   * Recursively applies styles to a control and its children
   */
  private applyStylesToControl(control: Control, style: any): void {
    // Apply style to this control
    this.styleService.applyStyles(control, [style]);
    
    // If it's a container, apply to children recursively
    if (control instanceof Rectangle || control instanceof StackPanel) {
      for (const child of control._children) {
        this.applyStylesToControl(child, style);
      }
    }
  }
}

// Helper function to check if a node is an ElementNode
function isElementNode(node: any): node is ElementNode {
  return node && typeof node === 'object' && 'type' in node;
}

