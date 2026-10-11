import * as T from '../vendor/three.module.min.js';
const cache=new Map();
export async function prepareProjectionTexture(project){const source=project.reconstruction?.atlas;if(!source||typeof document==='undefined'||cache.has(source))return;
 const image=new Image();image.src=source;await image.decode();if(image.width>2048||image.height>2048)throw Error('テクスチャ画像が大きすぎます');
 const texture=new T.Texture(image);texture.colorSpace=T.SRGBColorSpace;texture.needsUpdate=true;texture.userData.shared=true;cache.set(source,texture);
 // Keep only the current and previous atlas. Undo/import reloads evicted image data when needed.
 if(cache.size>2){const key=cache.keys().next().value;cache.get(key).dispose();cache.delete(key);}
}
export function projectionTexture(source){return cache.get(source)||null;}
