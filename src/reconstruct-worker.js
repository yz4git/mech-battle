import {reconstruct} from './auto-reconstruct.js?v=2.3.0';
self.onmessage=event=>{try{self.postMessage({ok:true,result:reconstruct(event.data.images,event.data.options)});}catch(e){self.postMessage({ok:false,error:e.message});}};
