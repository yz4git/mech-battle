# MECH FORGE — robot modeling research / 2026-10-11

## Implemented workflow

A-11 starts with the existing measured four-view contours, not a new claim of automated reconstruction. The supplied sheet is bundled as a reference. Edit named armor pieces, compare orthographic front/back/left/right projections, crop the source image, adjust overlay alignment, and trace extra panels. Traced polygons are extruded into real geometry with shallow bevels. Parent attachments keep the new armor with its selected joint. Named elbow and knee pivots support a rigid articulation preview. Export GLB with PBR materials, UVs and embedded textures; export OBJ for geometry-only exchange and JSON for continued editing.

The reference artwork has inconsistent perspective and asymmetry between views. Hidden faces are estimates. No pretrained image-to-3D model runs in this browser. This is a reference-assisted reconstruction editor; it does not guarantee complete, automatic, pixel-perfect replication of arbitrary images. The initial robot retains the previous approximation; screws, joints and markings need view-by-view refinement. The rigid node hierarchy is not a skinned character rig. Animation clips, physics collision hulls and LOD assets must be authored after export. Saved JSON preserves modeling controls; imported reference images remain browser-local and are not included in JSON.

## Research translated into design

### 1. Start with silhouette, landmarks and orthographic views

A model can have dense detail and still look wrong if shoulder width, hip height, head size or the foot silhouette differ. Orthographic cameras remove distance-dependent perspective scale, making projected comparisons practical. Establish sole, head, shoulder, elbow, hip, knee and ankle datums before adding bolts. Use independent views to constrain depth; a single view cannot uniquely determine it.

References: [Blender projections](https://docs.blender.org/manual/en/4.2/editors/3dview/navigate/projections.html), [reference image empties](https://docs.blender.org/manual/en/5.0/modeling/empties.html).

### 2. Treat armor as machined volumes

Broad planes, small bevels and stepped layering produce the mechanical silhouette and edge highlights. Do not model each panel as a central pyramid. Keep thickness and corners plausible relative to the full robot. Preserve face normals on broad panels; weighted normals can be a finishing step in Blender. The editor retains existing lofted contour armor and uses bevelled extrusion for new traced panels; it does not implement Blender's weighted normal modifier.

References: [Bevel](https://docs.blender.org/manual/en/4.0/modeling/meshes/editing/edge/bevel.html), [Weighted normals](https://docs.blender.org/manual/en/5.2/modeling/modifiers/normals/weighted_normal.html).

### 3. Mirror structure, retain designed asymmetry

Link translations and rotations across left/right limbs for proportional edits. Reflect X translation and Y/Z rotation signs. Leave weapons, antenna and missile pod independently editable. Symmetry reduces repetitive work but should not erase the asymmetric equipment in the sheet.

Reference: [Mirror modifier](https://docs.blender.org/manual/en/5.0/modeling/modifiers/generate/mirror.html).

### 4. Keep articulation distinct from surface detail

The armor, internal frame and moving joints must have separate responsibilities. Never fuse panels across an elbow or knee. Rigid nodes preserve names and pivots, enabling later engine animation. The editor rebases elbow/knee groups while keeping the initial world-space mesh fixed and attaches wrists/weapons and feet to their downstream joint. Preview is a clearance aid, not a full animation system. Complex rigging can be completed in Blender.

Reference: [Blender glTF export: node/keyframe/skinning animation](https://docs.blender.org/manual/en/latest/addons/scene_gltf2.html).

### 5. Export a reusable asset, not a screenshot

Use GLB to package meshes, PBR materials and textures together. Use meters, Y-up and +Z forward, floor at Y=0. Do not export editor lights, grid or selection box. Remove runtime objects and circular metadata. Restore preview transparency/wireframe/pose before writing the asset. JSON is the editable source format. OBJ deliberately does not carry the rigid hierarchy or PBR material setup.

References: [Three.js GLTFExporter](https://threejs.org/docs/pages/GLTFExporter.html), [glTF 2.0 specification](https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html), [Godot supported 3D formats](https://docs.godotengine.org/en/stable/tutorials/assets_pipeline/importing_3d_scenes/available_formats.html).

### 6. Optimize after silhouette and joint validation

Material batching can reduce draw calls without joining unrelated articulated components. Export full detail first, then make LOD variants. General decimation can erase tiny chamfers or panel gaps, so check the silhouette and joint clearances after reduction. Remeshing alone does not establish an animation-ready topology.

References: [Decimate modifier](https://docs.blender.org/manual/en/5.2/modeling/modifiers/generate/decimate.html), [Retopology](https://docs.blender.org/manual/en/latest/modeling/meshes/retopology.html).

### 7. Generative reconstruction is a separate pipeline

Hunyuan3D-2mv provides a genuine multiview-to-shape diffusion pipeline. Its official example uses front/left/back images, PyTorch and pretrained weights, then exports a mesh. This is useful research for an external generation stage, but it does not automatically recover named robot components, accurate joint mechanics, clean armor topology or a production rig. The current browser editor does not claim to run that model or silently upload references to a service. An integration would require a separate inference runtime and asset cleanup.

References: [Hunyuan3D-2](https://github.com/Tencent-Hunyuan/Hunyuan3D-2), [official multiview example](https://github.com/Tencent-Hunyuan/Hunyuan3D-2/blob/main/examples/shape_gen_multiview.py).

## Using the export

Three.js: load the GLB with GLTFLoader, add its scene, then address named nodes such as `forearmL`, `shinR`, `helmet` or `weaponR` with `getObjectByName`. Godot: import the GLB and create an inherited scene to add animation, scripts and collision. Blender: import glTF 2.0 and refine armor topology or author animations. Hidden components are omitted from GLB and OBJ. The editor is independent of combat saves: importing a model into the existing game is a separate feature.
