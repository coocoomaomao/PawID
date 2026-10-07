(() => {
  const ORT_VERSION = "1.30.0";
  const MODEL_URL = "https://huggingface.co/rafiazarin/multitask-unet-oxford-pets/resolve/main/pets_unet.onnx";
  const SIZE = 224;
  const MEAN = [0.485, 0.456, 0.406];
  const STD = [0.229, 0.224, 0.225];
  const OOD_MIN_MAX_LOGIT = 1.69;
  const OOD_MIN_PET_AREA = 0.0837;

  const BREEDS = [
    "Abyssinian","Bengal","Birman","Bombay","British_Shorthair","Egyptian_Mau",
    "Maine_Coon","Persian","Ragdoll","Russian_Blue","Siamese","Sphynx",
    "american_bulldog","american_pit_bull_terrier","basset_hound","beagle","boxer",
    "chihuahua","english_cocker_spaniel","english_setter","german_shorthaired",
    "great_pyrenees","havanese","japanese_chin","keeshond","leonberger",
    "miniature_pinscher","newfoundland","pomeranian","pug","saint_bernard","samoyed",
    "scottish_terrier","shiba_inu","staffordshire_bull_terrier","wheaten_terrier",
    "yorkshire_terrier"
  ];

  const ZH = {
    Abyssinian:"阿比西尼亚猫", Bengal:"孟加拉猫", Birman:"伯曼猫", Bombay:"孟买猫",
    British_Shorthair:"英国短毛猫", Egyptian_Mau:"埃及猫", Maine_Coon:"缅因猫",
    Persian:"波斯猫", Ragdoll:"布偶猫", Russian_Blue:"俄罗斯蓝猫", Siamese:"暹罗猫",
    Sphynx:"斯芬克斯猫", american_bulldog:"美国斗牛犬",
    american_pit_bull_terrier:"美国比特斗牛梗", basset_hound:"巴吉度猎犬",
    beagle:"比格犬", boxer:"拳师犬", chihuahua:"吉娃娃", english_cocker_spaniel:"英国可卡犬",
    english_setter:"英国塞特犬", german_shorthaired:"德国短毛指示犬",
    great_pyrenees:"大白熊犬", havanese:"哈瓦那犬", japanese_chin:"日本狆",
    keeshond:"荷兰毛狮犬", leonberger:"兰波格犬", miniature_pinscher:"迷你杜宾犬",
    newfoundland:"纽芬兰犬", pomeranian:"博美犬", pug:"巴哥犬", saint_bernard:"圣伯纳犬",
    samoyed:"萨摩耶犬", scottish_terrier:"苏格兰梗", shiba_inu:"柴犬",
    staffordshire_bull_terrier:"斯塔福郡斗牛梗", wheaten_terrier:"软毛麦色梗",
    yorkshire_terrier:"约克夏梗"
  };

  let session = null;
  let initPromise = null;

  function softmax(logits) {
    const max = Math.max(...logits);
    const exps = Array.from(logits, v => Math.exp(v - max));
    const sum = exps.reduce((a,b) => a+b, 0);
    return exps.map(v => v / sum);
  }

  function rgbToHsv(r,g,b) {
    r/=255; g/=255; b/=255;
    const max=Math.max(r,g,b), min=Math.min(r,g,b), d=max-min;
    let h=0;
    if (d) {
      if (max===r) h=((g-b)/d)%6;
      else if (max===g) h=(b-r)/d+2;
      else h=(r-g)/d+4;
      h*=60; if(h<0) h+=360;
    }
    return [h, max===0?0:d/max, max];
  }

  function estimateCoatColor(pixelData, seg) {
    const bins = {黑色:0, 白色:0, 灰色:0, 棕色:0, 橘黄色:0, 奶油色:0, 其他:0};
    let count = 0;
    for (let i=0;i<SIZE*SIZE;i+=3) {
      if (seg[i] <= 0) continue;
      const r=pixelData[i*4], g=pixelData[i*4+1], b=pixelData[i*4+2];
      const [h,s,v]=rgbToHsv(r,g,b);
      let k="其他";
      if (v<0.23) k="黑色";
      else if (s<0.10 && v>0.82) k="白色";
      else if (s<0.16) k="灰色";
      else if (h>=15 && h<42 && v>0.68) k="橘黄色";
      else if (h>=38 && h<70 && s<0.42 && v>0.65) k="奶油色";
      else if ((h<35 || h>345) && v<0.68) k="棕色";
      bins[k]++; count++;
    }
    if (!count) return "无法估算";
    const ranked=Object.entries(bins).sort((a,b)=>b[1]-a[1]).filter(x=>x[1]/count>0.12);
    if (!ranked.length) return "无法估算";
    const first=ranked[0][0], second=ranked[1]?.[0];
    return second && second!=="其他" ? `${first} / ${second}为主` : `${first}为主`;
  }

  async function fetchBytes(url, onProgress) {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`模型下载失败 HTTP ${res.status}`);
    const total = Number(res.headers.get("Content-Length")) || 0;
    const reader = res.body.getReader();
    const chunks=[]; let got=0;
    while (true) {
      const {done,value}=await reader.read();
      if (done) break;
      chunks.push(value); got+=value.length;
      if (onProgress) onProgress({phase:"download", got, total});
    }
    const bytes=new Uint8Array(got); let off=0;
    for (const c of chunks) { bytes.set(c,off); off+=c.length; }
    return bytes;
  }

  async function ensureModel(onProgress) {
    if (session) return session;
    if (initPromise) return initPromise;
    initPromise=(async()=>{
      if (!window.ort) throw new Error("ONNX Runtime 未加载");
      ort.env.wasm.wasmPaths=`https://cdn.jsdelivr.net/npm/onnxruntime-web@${ORT_VERSION}/dist/`;
      ort.env.wasm.numThreads=self.crossOriginIsolated?Math.min(4,navigator.hardwareConcurrency||1):1;
      onProgress?.({phase:"starting"});
      const bytes=await fetchBytes(MODEL_URL,onProgress);
      session=await ort.InferenceSession.create(bytes,{executionProviders:["wasm"]});
      const zero=new ort.Tensor("float32",new Float32Array(3*SIZE*SIZE),[1,3,SIZE,SIZE]);
      await session.run({[session.inputNames[0]]:zero});
      onProgress?.({phase:"ready"});
      return session;
    })();
    try { return await initPromise; }
    catch(e) { initPromise=null; throw e; }
  }

  function loadImage(file) {
    return new Promise((resolve,reject)=>{
      const img=new Image();
      const url=URL.createObjectURL(file);
      img.onload=()=>{URL.revokeObjectURL(url);resolve(img)};
      img.onerror=()=>{URL.revokeObjectURL(url);reject(new Error("无法读取图片"))};
      img.src=url;
    });
  }

  async function analyzeOne(file,onProgress) {
    const sess=await ensureModel(onProgress);
    const img=await loadImage(file);
    const c=document.createElement("canvas"); c.width=c.height=SIZE;
    const ctx=c.getContext("2d",{willReadFrequently:true});
    ctx.imageSmoothingQuality="high";
    ctx.drawImage(img,0,0,SIZE,SIZE);
    const px=ctx.getImageData(0,0,SIZE,SIZE).data;
    const input=new Float32Array(3*SIZE*SIZE);
    for(let i=0;i<SIZE*SIZE;i++) for(let ch=0;ch<3;ch++)
      input[ch*SIZE*SIZE+i]=(px[i*4+ch]/255-MEAN[ch])/STD[ch];

    const t0=performance.now();
    const out=await sess.run({[sess.inputNames[0]]:new ort.Tensor("float32",input,[1,3,SIZE,SIZE])});
    const ms=performance.now()-t0;
    const seg=(out.seg_logits||out[sess.outputNames[0]]).data;
    const cls=(out.cls_logits||out[sess.outputNames[1]]).data;
    const probs=softmax(cls);
    let petPx=0; for(let i=0;i<seg.length;i++) if(seg[i]>0) petPx++;
    const petArea=petPx/seg.length;
    const maxLogit=Math.max(...cls);
    const ranked=probs.map((p,i)=>({p,i})).sort((a,b)=>b.p-a.p);
    return {
      file, imgWidth:img.naturalWidth, imgHeight:img.naturalHeight,
      seg:new Float32Array(seg), probs, logits:Array.from(cls),
      petArea, maxLogit, ms,
      ood:maxLogit<OOD_MIN_MAX_LOGIT || petArea<OOD_MIN_PET_AREA,
      species:ranked[0].i<12?"猫":"狗",
      coatColor:estimateCoatColor(px,seg)
    };
  }

  function appearanceAssessment(top) {
    const p1=top[0]?.similarity||0, p2=top[1]?.similarity||0;
    if (p1>=0.70 && p1-p2>=0.30) return "外观特征较集中";
    if (p1<0.45 || p1-p2<0.12) return "外观相似度较分散";
    return "外观特征中等集中";
  }

  async function analyze(files, meta={}, onProgress) {
    const list=files.slice(0,3);
    if(!list.length) throw new Error("请至少上传一张照片");
    const perPhoto=[];
    for(let i=0;i<list.length;i++){
      onProgress?.({phase:"analyzing",index:i,total:list.length});
      perPhoto.push(await analyzeOne(list[i],onProgress));
    }
    const usable=perPhoto.filter(x=>!x.ood);
    const pool=usable.length?usable:perPhoto;
    const avg=new Array(BREEDS.length).fill(0);
    for(const r of pool) for(let i=0;i<avg.length;i++) avg[i]+=r.probs[i]/pool.length;
    const top=avg.map((p,i)=>({name:ZH[BREEDS[i]]||BREEDS[i],key:BREEDS[i],similarity:p,species:i<12?"猫":"狗"}))
      .sort((a,b)=>b.similarity-a.similarity).slice(0,3);
    const speciesScore=avg.slice(0,12).reduce((a,b)=>a+b,0);
    const species=speciesScore>=0.5?"猫":"狗";
    const coatCounts={};
    for(const r of pool) coatCounts[r.coatColor]=(coatCounts[r.coatColor]||0)+1;
    const coatColor=Object.entries(coatCounts).sort((a,b)=>b[1]-a[1])[0]?.[0]||"无法估算";
    const assessment=appearanceAssessment(top);
    return {
      breeds:top,
      traits:{
        coatColor,
        coatLength:"当前模型不判断",
        eyeColor:"当前模型不判断",
        earShape:"当前模型不判断",
        faceShape:"当前模型不判断",
        bodyType:"当前模型不判断",
        species
      },
      mixAssessment:assessment,
      confidence: usable.length===perPhoto.length ? "normal" : "caution",
      oodCount: perPhoto.length-usable.length,
      perPhoto,
      primary:perPhoto[0],
      disclaimer:"仅根据照片与 37 类训练集做外观相似度分析；不能证明纯种、混血或真实血统。‘特征分散’只是模型相似度分布的描述。",
      modelInfo:"EfficientNet-B0 U-Net · Oxford-IIIT Pet · 37 breeds"
    };
  }

  async function makePassport(file, result, bg="#ffffff", size=1024) {
    const img=await loadImage(file);
    const out=document.createElement("canvas"); out.width=out.height=size;
    const ctx=out.getContext("2d",{willReadFrequently:true});
    ctx.fillStyle=bg; ctx.fillRect(0,0,size,size);

    const scale=Math.min((size*0.90)/img.naturalWidth,(size*0.90)/img.naturalHeight);
    const w=Math.max(1,Math.round(img.naturalWidth*scale)), h=Math.max(1,Math.round(img.naturalHeight*scale));
    const ox=Math.round((size-w)/2), oy=Math.round((size-h)/2);

    const photo=document.createElement("canvas"); photo.width=w; photo.height=h;
    const pctx=photo.getContext("2d",{willReadFrequently:true});
    pctx.drawImage(img,0,0,w,h);
    const pdata=pctx.getImageData(0,0,w,h);

    const m=document.createElement("canvas"); m.width=m.height=SIZE;
    const mctx=m.getContext("2d");
    const mi=mctx.createImageData(SIZE,SIZE);
    for(let i=0;i<SIZE*SIZE;i++){
      const prob=1/(1+Math.exp(-result.seg[i]));
      const a=Math.max(0,Math.min(255,Math.round((prob-0.35)/0.35*255)));
      mi.data[i*4]=mi.data[i*4+1]=mi.data[i*4+2]=255; mi.data[i*4+3]=a;
    }
    mctx.putImageData(mi,0,0);
    const ms=document.createElement("canvas"); ms.width=w; ms.height=h;
    ms.getContext("2d").drawImage(m,0,0,w,h);
    const alpha=ms.getContext("2d").getImageData(0,0,w,h).data;
    for(let i=0;i<w*h;i++) pdata.data[i*4+3]=alpha[i*4+3];
    pctx.putImageData(pdata,0,0);
    ctx.drawImage(photo,ox,oy);
    return out;
  }

  window.PawIDAI={ensureModel,analyze,makePassport,breeds:BREEDS};
})();