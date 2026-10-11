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

## v2.1 automatic browser reconstruction

The Image tab now offers automatic generation from a four-view sheet or a single front image. A Web Worker extracts foreground masks with a configurable background-color threshold, connected-component cleanup, seam closing and enclosed-hole filling. It intersects front and left silhouettes on a volume grid to infer depth, projects front/back colors, emits exposed surface faces and assigns humanoid height/width regions to rigid joints. This replaces the initial approximation with geometry derived from the loaded image. Standard/high/maximum grids use 64/96/128 vertical cells. It runs entirely in the browser and exports through the same GLB pipeline. Generated meshes and colors persist in editable JSON.

This is visual-hull reconstruction, not neural reconstruction. It cannot infer concave surfaces hidden from silhouettes. The supplied sheet also has inconsistent proportions across views; thin structures can disappear, equipment can be assigned to the wrong joint, and dark or cluttered backgrounds can require threshold/crop adjustment. Single-image depth is a rounded approximation. Output is a discretized block surface; it needs cleanup for production-quality armor. It does not promise a complete replica. On arbitrary four-view layouts, manually set front/side/back crops before generating. The “four-view placement” preset is specific to the supplied A-11 sheet.

## v2.2 continuous surfaces and multiview registration

Generation now samples signed distances to the extracted silhouettes and uses interpolated dual surface vertices, replacing exposed voxel faces. Face normals are smoothed across small angles while stronger armor creases remain. Border-background estimation uses channel medians rather than an average contaminated by equipment near crop edges. The closing radius scales with input resolution. The head/body datum and floor align vertical scale; the distribution of lower-leg pixels estimates the robot's center axis independently of its rifle or shoulder pod. Width/depth transforms also align the rear and both side crops. Both side signed fields contribute to geometry; rear disagreement uses a small tolerance to accommodate inconsistent illustration poses.

Colors use full source RGB and select front/rear/left/right projection using surface normals. Higher quality uses 384px crop samples; the recommended volume grid uses 96 vertical samples and the maximum uses 128. Projected intersection-over-union scores are reported for every available view. These compare the generated projection to the processed foreground masks, not to a ground-truth 3D model. Back and side scores can remain low when illustrations differ between views. Inferred concavities, hidden details, exact joint mechanics and texture unwrapping remain unresolved. The surface-net mesh can contain touching nonmanifold regions at ambiguous silhouette cells; production collision or fabrication needs cleanup.

Generated geometry now saves with IndexedDB to avoid the smaller localStorage quota, while legacy projects and v1 block meshes remain readable. Undo snapshots share immutable geometry to avoid repeatedly cloning the entire mesh. Regenerate an old image to receive the continuous-surface method; loading an old saved model intentionally preserves its existing geometry.

## v2.3 multiview refinement, source textures and shallow armor relief

A bounded affine search now refines rear-to-front and right-to-left registration using foreground intersection-over-union, with limits on shifts/scales to avoid unbounded deformation. Both side silhouettes are then used in the reconstruction. Registration scores remain comparisons of processed drawings rather than ground-truth geometry. The supplied A-11 sheet still contains substantial front/back disagreement.

Four 512px reference crops are packed into a browser-generated 1024px texture atlas. Every surface triangle receives projected UV coordinates from the source view selected by its face normal. The image retains markings, bolts and thin illumination lines more faithfully than one averaged color per triangle. The atlas and UV coordinates persist in project JSON and the atlas is embedded by GLB export. Texture preload is awaited before generation, imports and undo reconstruction; old projects without atlases retain vertex-color rendering. This is projective texturing, not a recovered material/lighting decomposition or hand-unwrapped UV asset. Boundary seams and baked illustration shadows can remain.

A conservative image-guided inset adds shallow relief to dark frame areas behind light armor. It uses locally averaged luminance, limits displacement to a small fraction of height, and avoids silhouette edges and thin geometry. The user can reduce it to zero with the armor relief slider. This depth is an explicit heuristic, not a recovered measurement. Hidden mechanical geometry, accurate internal joint segmentation, and production remeshing remain separate work.

## v2.4 rounded cross sections and occlusion-aware projection

A configurable cross-section prior rounds the corners of silhouette intersections. Separate foreground intervals at each height preserve the gap between legs; a superellipse combines the front and side intervals in physical width/depth coordinates. This reduces the slab-like, box-corner volume produced by silhouette intersection. It does not recover hidden geometry from the image. Turn the cross-section slider down to restore the original intersection. Single-view reconstruction retains its prior depth method.

Source texture selection now checks whether the projected triangle center actually lands inside the selected view's foreground. If a rifle is absent in the back drawing, or a side crop disagrees, another supported view is selected rather than projecting the drawing's background. One view is selected for the entire triangle; its three UVs always use the same atlas tile. Texture seams and baked shading remain possible. The A-11 back drawing omits the front rifle, so improving hidden corner shape should not be mistaken for eliminating that source inconsistency.

## v2.4.1 armor attachment and editing fixes

Disconnected thin shells in generated meshes receive short dark frame brackets where nearby body surfaces exist. The search is bounded to 5.5% of model height; distant equipment and complete detached limbs are not joined by invented long bridges. Tiny isolated fragments under 4% height and 100 triangles are omitted from display/export. Mounts are inferred structural details, not measured geometry. This correction is also applied when opening existing v2 generated projects; source geometry is retained in editable JSON.

Model scale and floor calibration now use the unedited body. Moving, scaling or hiding a part no longer changes the scale of unrelated parts. Two-finger pinch controls model zoom and suppresses tap selection until both fingers are released. Generated texture atlases are captured before worker processing so changing reference images during generation cannot mix the old geometry with a new texture. Image decoding failures now show an error and keep the prior reference.

## v2.4.2 seat armor and preserve baked detail transforms

The previous bracket-only treatment did not eliminate floating plates. Detached thin shells now move as rigid pieces to the nearest body contact with a small overlap, within a bounded 12% height search. Thin shells without a nearby body contact are omitted rather than left in empty space. No substitute long brackets are added. The original project geometry remains available; the correction is applied consistently to rendered meshes and game exports. Separate full-volume limbs are retained.

The default A-11 model also had baked matrix groups for reference decorations. Before the editor relocates joint pivots, those matrices are decomposed into editable transforms. Child position compensation now affects the rendered matrix, preserving the rest location of armor details instead of moving them with the relocated pivot. This applies on reloading saved projects as well as newly initialized models.
