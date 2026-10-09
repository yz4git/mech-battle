# Armor coating

`armor-coating-v1.2.webp` はこのゲーム用にOpenAIの画像生成ツールで制作した共有表面素材です。生成したPNGをWebP（quality 86、method 6）へ変換し、機体の塗装・金属面のアルベド、粗さ、微細なバンプに使用しています。ロボットと武器はすべてコードで構築した3D形状です。

## Generation prompt

```text
Create one 1024 x 1024 seamless physically based game material ALBEDO texture. A flat orthographic evenly lit square of neutral light-gray painted titanium armor, the paint is primarily RGB 205,205,201. Subtle powder-coated micrograin, sparse tiny hairline scratches, minute chipped spots revealing dark metal, extremely restrained oil discoloration. Realistic fine surface detail suitable for close-up original military mech armor. No robot, no object illustration, no panels, no bolts, no lines separating panels, no text, no logos, no baked lighting or shadows, no broad rust or camouflage patches. Uniform scale over the entire tile. Texture tiles seamlessly on all four sides. This is a production texture to multiply material colors on bevelled armor meshes. Save the generated asset so its path can be used in the project.
```
