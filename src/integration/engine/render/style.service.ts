import { Injectable } from '@angular/core';
import { Style } from '../../../domain/entities/style/style.entity';
import { Stylesheet } from '../../../domain/entities/style/stylesheet.entity';
import { Control, TextBlock, Rectangle } from '@babylonjs/gui';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import { MeshBuilder, Vector3 } from '@babylonjs/core';

@Injectable({
  providedIn: 'root'
})
export class StyleService {
  private stylesheetCache: Map<string, Stylesheet> = new Map();

  constructor() {}

  /**
   * Loads a stylesheet and all its imported stylesheets recursively
   */
  async loadStylesheet(stylesheetId: string): Promise<Style[]> {
    // Check cache first
    if (this.stylesheetCache.has(stylesheetId)) {
      return this.getStylesFromStylesheet(this.stylesheetCache.get(stylesheetId)!);
    }

    // TODO: Replace with actual API call to fetch stylesheet
    const stylesheet = await this.fetchStylesheet(stylesheetId);
    this.stylesheetCache.set(stylesheetId, stylesheet);

    // Load all imported stylesheets recursively
    const importedStyles: Style[] = [];
    for (const importedId of stylesheet.importedStylesheetIds) {
      const importedStylesheetStyles = await this.loadStylesheet(importedId);
      importedStyles.push(...importedStylesheetStyles);
    }

    // Combine imported styles with local styles
    return [...importedStyles, ...stylesheet.styles];
  }

  /**
   * Applies styles to a Babylon.js GUI control, resolving 'inherit' by walking up the style chain.
   * The 'styles' array should be ordered from parent to child (lowest to highest specificity).
   */
  applyStyles(control: Control, styles: Style[]): void {
    // Merge all style properties, resolving 'inherit' by walking up the chain
    const mergedProps: any = {};
    for (const style of styles) {
      for (const key of Object.keys(style.properties)) {
        const value = style.properties[key];
        if (value === 'inherit') {
          // Do not overwrite, keep parent value if present
          continue;
        }
        mergedProps[key] = value;
      }
    }
    // Apply styles based on control type and properties
    this.applyBasicStyles(control, mergedProps);
    
    // Apply background and border styles based on their types
    this.applyBackgroundStyles(control, mergedProps);
    this.applyBorderStyles(control, mergedProps);
    
    if (control instanceof TextBlock) {
      this.applyTextStyles(control, mergedProps);
    }
    
    if (control instanceof Rectangle) {
      // Container styles are applied after background/border to ensure proper rendering order
      // For example, if background sets a texture, ensure container styles don't override it.
      // Also, border needs to be applied after background for correct visual stacking.
      // We already call applyContainerStyles, so let's ensure it works with the new types.
      this.applyContainerStyles(control, mergedProps);
    }
  }

  private applyBasicStyles(control: Control, props: Style['properties']): void {
    // Padding
    if (props.paddingLeft) control.paddingLeft = props.paddingLeft;
    if (props.paddingRight) control.paddingRight = props.paddingRight;
    if (props.paddingTop) control.paddingTop = props.paddingTop;
    if (props.paddingBottom) control.paddingBottom = props.paddingBottom;
    
    // Margin/Position - using left/top as these are the valid properties in BabylonJS
    if (props.marginLeft) control.left = props.marginLeft;
    if (props.marginTop) control.top = props.marginTop;
    
    // Dimensions
    if (props.width) control.width = props.width;
    if (props.height) control.height = props.height;
    
    // Alignment
    if (props.horizontalAlignment) {
      switch (props.horizontalAlignment) {
        case 'left':
          control.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
          break;
        case 'center':
          control.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
          break;
        case 'right':
          control.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
          break;
      }
    }
    
    if (props.verticalAlignment) {
      switch (props.verticalAlignment) {
        case 'top':
          control.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
          break;
        case 'center':
          control.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
          break;
        case 'bottom':
          control.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
          break;
      }
    }
  }

  private applyTextStyles(textBlock: TextBlock, props: Style['properties']): void {
    // Text-specific properties
    if (props.foregroundColor) textBlock.color = props.foregroundColor;
    if (props.fontSize) textBlock.fontSize = parseInt(props.fontSize);
    if (props.fontWeight) textBlock.fontWeight = props.fontWeight;
    if (props.fontFamily) textBlock.fontFamily = props.fontFamily;
    
    // First set horizontalAlignment to ensure the container aligns properly
    if (props.horizontalAlignment) {
      switch (props.horizontalAlignment) {
        case 'left':
          textBlock.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
          break;
        case 'center':
          textBlock.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
          break;
        case 'right':
          textBlock.horizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
          break;
      }
    }
    
    // Now set textHorizontalAlignment with explicit property or inherit from horizontalAlignment
    if (props.textHorizontalAlignment) {
      switch (props.textHorizontalAlignment) {
        case 'left':
          textBlock.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
          break;
        case 'center':
          textBlock.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
          break;
        case 'right':
          textBlock.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
          break;
      }
    } 
    // Important: Always ensure textHorizontalAlignment matches horizontalAlignment if not set
    else if (props.horizontalAlignment) {
      switch (props.horizontalAlignment) {
        case 'left':
          textBlock.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_LEFT;
          break;
        case 'center':
          textBlock.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_CENTER;
          break;
        case 'right':
          textBlock.textHorizontalAlignment = Control.HORIZONTAL_ALIGNMENT_RIGHT;
          break;
      }
    }
    
    // First set verticalAlignment to ensure the container aligns properly
    if (props.verticalAlignment) {
      switch (props.verticalAlignment) {
        case 'top':
          textBlock.verticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
          break;
        case 'center':
          textBlock.verticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
          break;
        case 'bottom':
          textBlock.verticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
          break;
      }
    }
    
    // Now handle textVerticalAlignment
    if (props.textVerticalAlignment) {
      switch (props.textVerticalAlignment) {
        case 'top':
          textBlock.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
          break;
        case 'center':
          textBlock.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
          break;
        case 'bottom':
          textBlock.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
          break;
      }
    }
    // Important: Always ensure textVerticalAlignment matches verticalAlignment if not set
    else if (props.verticalAlignment) {
      switch (props.verticalAlignment) {
        case 'top':
          textBlock.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_TOP;
          break;
        case 'center':
          textBlock.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_CENTER;
          break;
        case 'bottom':
          textBlock.textVerticalAlignment = Control.VERTICAL_ALIGNMENT_BOTTOM;
          break;
      }
    }
  }

  /**
   * Applies background styles to a Babylon.js GUI control based on backgroundType.
   * @param control The GUI control to apply styles to.
   * @param props The style properties.
   */
  private applyBackgroundStyles(control: Control, props: Style['properties']): void {
    const backgroundType = props.backgroundType || 'solid'; // Default to 'solid'
    console.log(`Applying background style: ${backgroundType} to control: ${control.name}`);

    switch (backgroundType) {
      case 'solid':
        const solidColor = props.backgroundColor || '#222'; // Default to #222
        if (control instanceof Rectangle) {
          control.background = solidColor;
          console.log(`  Solid background color: ${solidColor}`);
        }
        break;
      case 'gradient':
        // Default gradient: linear from #0f7fd8 (0) to #00896e (1)
        const gradientStops = props.gradientStops || [
          { color: '#0f7fd8', position: 0 },
          { color: '#00896e', position: 1 }
        ];
        // BabylonJS GUI does not directly support CSS-like linear gradients out of the box.
        // This would require custom shader or advanced dynamic texture manipulation.
        // For now, we will log a warning and fallback to solid background.
        console.warn(`  Gradient background is not directly supported by BabylonJS GUI Rectangle control. Falling back to solid color.`);
        if (control instanceof Rectangle) {
          control.background = gradientStops[0].color; // Use the first color as fallback
        }
        break;
      case 'image':
        const imageUrl = props.backgroundImageUrl || 'src/presentation/assets/images/image-background.png';
        // Apply image background to Rectangle. This might require creating an Image control
        // and setting it as a background, or using AdvancedDynamicTexture.CreateForMesh
        // if this is a mesh-attached GUI.
        if (control instanceof Rectangle) {
          // In Babylon.js GUI, setting an image background for a Rectangle directly isn't straightforward.
          // A common approach is to create an Image control and add it as a child behind other elements.
          // For simplicity, we'll log for now.
          console.warn(`  Image background is not directly supported by BabylonJS GUI Rectangle control. Falling back to transparent.`);
          control.background = 'transparent'; // Fallback to transparent
        } else {
          console.warn(`  Image background is only applicable to Rectangle controls. Skipping for ${control.constructor.name}.`);
        }
        break;
      case 'material':
        // Material backgrounds are typically applied to 3D meshes, not 2D GUI controls.
        // This constraint needs to be enforced at a higher level (e.g., PageLayoutService).
        console.warn(`  Material background type is intended for 3D meshes and site-level application, not direct GUI controls. Skipping for ${control.constructor.name}.`);
        break;
      default:
        console.warn(`  Unknown background type: ${backgroundType}. Falling back to solid.`);
        if (control instanceof Rectangle) {
          control.background = props.backgroundColor || '#222';
        }
        break;
    }
  }

  /**
   * Applies border styles to a Babylon.js GUI control based on borderType.
   * @param control The GUI control to apply styles to.
   * @param props The style properties.
   */
  private applyBorderStyles(control: Control, props: Style['properties']): void {
    const borderType = props.borderType || 'solid'; // Default to 'solid'
    console.log(`Applying border style: ${borderType} to control: ${control.name}`);

    if (control instanceof Rectangle) {
      switch (borderType) {
        case 'solid':
          const borderWidthNum = parseInt(props.borderWidth || '0');
          const borderColor = props.borderColor || 'transparent';
          if (borderWidthNum > 0) {
            control.thickness = borderWidthNum;
            control.color = borderColor;
            console.log(`  Solid border: width=${borderWidthNum}, color=${borderColor}`);
          } else {
            control.thickness = 0;
            control.color = 'transparent';
            console.log(`  Solid border: thickness 0 or invalid, setting transparent.`);
          }
          break;
        case 'gradient':
          const gradientStops = props.gradientStops || [
            { color: '#0f7fd8', position: 0 },
            { color: '#00896e', position: 1 }
          ];
          console.warn(`  Gradient border is not directly supported by BabylonJS GUI Rectangle control. Falling back to solid border.`);
          control.thickness = parseInt(props.borderWidth || '0');
          control.color = gradientStops[0].color; // Use the first color as fallback
          break;
        case 'material':
          // Material borders are typically applied to 3D meshes, not 2D GUI controls.
          console.warn(`  Material border type is intended for 3D meshes and site-level application, not direct GUI controls. Skipping for ${control.constructor.name}.`);
          control.thickness = 0;
          control.color = 'transparent';
          break;
        default:
          console.warn(`  Unknown border type: ${borderType}. Falling back to solid.`);
          control.thickness = parseInt(props.borderWidth || '0');
          control.color = props.borderColor || 'transparent';
          break;
      }
    } else {
      console.warn(`Border styles are only applicable to Rectangle controls. Skipping for ${control.constructor.name}.`);
    }
  }

  /**
   * Applies a border to a BabylonJS mesh (e.g., a hexagon in the hex-flower theme) using a line mesh above the hex.
   * The border is constructed from the hex's edge vertices and rendered above the mesh.
   * Uses a 2D convex hull (X/Z plane) for robust perimeter extraction.
   * @param mesh The BabylonJS mesh to apply the border to
   * @param borderWidth The width of the border (used for line thickness)
   * @param borderColor The color of the border (outline) as a hex string (e.g., '#FFFFFF')
   */
  applyHexBorder(mesh: any, borderWidth: number, borderColor: string): void {
    if (!mesh) return;
    // Only create the border if it doesn't already exist with the same color/width
    if (mesh._borderLine && mesh._borderLine.metadata && mesh._borderLine.metadata.lastColor === borderColor && mesh._borderLine.metadata.lastWidth === borderWidth) {
      return;
    }
    // Remove any previous border line
    if (mesh._borderLine) {
      mesh._borderLine.dispose();
      mesh._borderLine = null;
    }
    // Extract all top face vertices (max Y for BabylonJS cylinders)
    const positions = mesh.getVerticesData && mesh.getVerticesData("position");
    if (!positions) return;
    let maxY = -Infinity;
    for (let i = 1; i < positions.length; i += 3) {
      if (positions[i] > maxY) maxY = positions[i];
    }
    const epsilon = 0.001;
    // Collect all vertices on the top face (Y ~= maxY)
    let topVerts: { x: number, y: number, z: number }[] = [];
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i], y = positions[i+1], z = positions[i+2];
      if (Math.abs(y - maxY) < epsilon) {
        topVerts.push({ x, y, z });
      }
    }
    if (topVerts.length < 3) return; // Not enough points for a border
    // 2D Convex Hull (Andrew's monotone chain) on X/Z
    topVerts.sort((a, b) => a.x === b.x ? a.z - b.z : a.x - b.x);
    function cross(o: any, a: any, b: any) {
      return (a.x - o.x) * (b.z - o.z) - (a.z - o.z) * (b.x - o.x);
    }
    let lower: any[] = [];
    for (let v of topVerts) {
      while (lower.length >= 2 && cross(lower[lower.length-2], lower[lower.length-1], v) <= 0) lower.pop();
      lower.push(v);
    }
    let upper: any[] = [];
    for (let i = topVerts.length - 1; i >= 0; i--) {
      let v = topVerts[i];
      while (upper.length >= 2 && cross(upper[upper.length-2], upper[upper.length-1], v) <= 0) upper.pop();
      upper.push(v);
    }
    // Remove last point of each (it's duplicated)
    upper.pop();
    lower.pop();
    const hull = lower.concat(upper);
    if (hull.length < 3) return;
    // Offset border above mesh to avoid z-fighting
    const yOffset = 0.01;
    const borderPoints = hull.map(p => new Vector3(p.x, p.y + yOffset, p.z));
    borderPoints.push(borderPoints[0]); // Close the loop
    // Create the border line mesh in local space, parent to mesh
    const borderLine = MeshBuilder.CreateLines(mesh.name + "_borderLine", { points: borderPoints, updatable: false }, mesh.getScene());
    borderLine.color = Color3.FromHexString(borderColor);
    borderLine.isPickable = false;
    borderLine.visibility = 1;
    borderLine.alwaysSelectAsActiveMesh = true;
    borderLine.metadata = borderLine.metadata || {};
    borderLine.metadata.lastColor = borderColor;
    borderLine.metadata.lastWidth = borderWidth;
    if (borderLine.enableEdgesRendering) {
      borderLine.enableEdgesRendering();
      borderLine.edgesWidth = borderWidth * 6;
      borderLine.edgesColor = Color3.FromHexString(borderColor).toColor4(1);
    }
    borderLine.parent = mesh;
    mesh._borderLine = borderLine;
  }

  /**
   * Removes the border line for a BabylonJS hex mesh.
   */
  removeHexBorder(mesh: any): void {
    if (!mesh) return;
    if (mesh._borderLine) {
      mesh._borderLine.dispose();
      mesh._borderLine = null;
    }
  }

  // Only applies to BabylonJS GUI Rectangle controls, not 3D meshes. For hex meshes, use applyHexBorder.
  private applyContainerStyles(container: Rectangle, props: Style['properties']): void {
    // Container-specific properties
    if (props.fillSpace) {
      container.width = "120%";  // Special case for hex panels
      container.height = "120%";
    }
    // Background color is now handled by applyBackgroundStyles
    // if (props.backgroundColor) {
    //   container.background = props.backgroundColor;
    // }

    // Border styles are now handled by applyBorderStyles
    // if (props.borderWidth && props.borderColor) {
    //   const borderWidthNum = parseInt(props.borderWidth);

    //   if (isNaN(borderWidthNum) || borderWidthNum <= 0) {
    //     container.thickness = 0;
    //     container.color = "transparent";
    //   } else {
    //     container.thickness = borderWidthNum;
    //     container.color = props.borderColor;

    //     if (props.fillSpace) {
    //       container.paddingLeft = "0px";
    //       container.paddingRight = "0px";
    //       container.paddingTop = "0px";
    //       container.paddingBottom = "0px";

    //       console.log(
    //         `Border for fillSpace container (name: ${container.name || 'undefined'}): ` +
    //         `width=${borderWidthNum}, color=${props.borderColor}. ` +
    //         `Padding after adjustment: L=${container.paddingLeft}, R=${container.paddingRight}, T=${container.paddingTop}, B=${container.paddingBottom}`
    //       );
    //     }
    //   }
    // } else {
    //   container.thickness = 0;
    //   container.color = "transparent";
    // }

    if (props.borderStyle) {
      // Log if borderStyle is provided, though BabylonJS Rectangle doesn't directly use it like CSS.
      console.log(`Border style specified: ${props.borderStyle} for container ${container.name || 'undefined'} (Note: BabylonJS Rectangle does not directly support CSS-like border-style).`);
    }
  }

  private async fetchStylesheet(stylesheetId: string): Promise<Stylesheet> {
    // For now, return a default stylesheet
    return {
      _id: stylesheetId,
      name: 'Default Stylesheet',
      styles: [
        {
          _id: 'default-style',
          name: 'Default Style',
          properties: {
            fontSize: '16px',
            fontWeight: 'normal',
            fontFamily: 'Arial',
            foregroundColor: 'white',
            backgroundColor: 'transparent',
            paddingLeft: '10px',
            paddingRight: '10px',
            paddingTop: '5px',
            paddingBottom: '5px'
          }
        }
      ],
      importedStylesheetIds: []
    };
  }

  private getStylesFromStylesheet(stylesheet: Stylesheet): Style[] {
    return stylesheet.styles;
  }

  /**
   * Returns the style chain for a node, from root to leaf, based on site data hierarchy.
   * This should be used to resolve inheritance (e.g., 'inherit' values) correctly.
   */
  getStyleChain(node: any, stylesheetMap: Map<string, any>): Style[] {
    const chain: Style[] = [];
    let current = node;
    while (current) {
      if (current._id) {
        const style = stylesheetMap.get(current._id);
        if (style) chain.unshift(style);
      }
      current = current.parent;
    }
    return chain;
  }
}