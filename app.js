const MAX_PHOTOS=3;
const photos=[];
const passportColors=[['白底','#ffffff'],['蓝底','#cfe4ff'],['粉底','#ffdbe2'],['薄荷绿','#d8f7e9']];
let lastAnalysis=null;

const $=s=>document.querySelector(s);
const toast=m=>{const t=$('#toast');t.textContent=m;t.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.classList.remove('show'),2000)};

function renderPhotos(){
  const grid=$('#photoGrid');
  grid.innerHTML=photos.map((p,i)=>`<div class="photo-card"><img src="${p.url}" alt="宠物照片 ${i+1}"><button data-remove="${i}" aria-label="删除">×</button></div>`).join('');
  $('#uploadBox').style.display=photos.length>=MAX_PHOTOS?'none':'flex';
}

$('#photoInput').addEventListener('change',e=>{
  [...e.target.files].slice(0,MAX_PHOTOS-photos.length).forEach(file=>{
    if(!file.type.startsWith('image/'))return;
    photos.push({file,url:URL.createObjectURL(file)});
  });
  e.target.value=''; renderPhotos();
});

$('#photoGrid').addEventListener('click',e=>{
  const b=e.target.closest('[data-remove]'); if(!b)return;
  const i=Number(b.dataset.remove); URL.revokeObjectURL(photos[i].url); photos.splice(i,1); renderPhotos();
});

function loadImg(src){return new Promise((res,rej)=>{const i=new Image();i.onload=()=>res(i);i.onerror=rej;i.src=src})}

function updateAIStatus(ev){
  const label=$('#aiStatus'), text=$('#aiProgressText'), bar=$('#aiProgressBar');
  if(ev.phase==='download'){
    label.textContent='正在下载本地 AI 模型…';
    if(ev.total){
      const pct=Math.min(100,ev.got/ev.total*100);
      bar.style.width=pct.toFixed(1)+'%';
      text.textContent=`${(ev.got/1e6).toFixed(1)} / ${(ev.total/1e6).toFixed(1)} MB`;
    }else{
      bar.style.width='35%'; text.textContent=`${(ev.got/1e6).toFixed(1)} MB`;
    }
  }else if(ev.phase==='starting'){
    label.textContent='正在启动 AI 模型…'; bar.style.width='8%'; text.textContent='首次加载';
  }else if(ev.phase==='ready'){
    label.textContent='AI 模型已就绪'; bar.style.width='100%'; text.textContent='本地运行';
  }else if(ev.phase==='analyzing'){
    label.textContent=`正在分析第 ${ev.index+1} / ${ev.total} 张照片…`;
    text.textContent='照片不会上传';
  }
}

function renderAnalysis(data){
  const cards=$('#breedGrid').querySelectorAll('.breed-card');
  cards.forEach(card=>card.classList.add('ghost'));
  data.breeds.slice(0,3).forEach((breed,i)=>{
    if(!cards[i])return;
    cards[i].classList.remove('ghost');
    cards[i].querySelector('b').textContent=breed.name;
    cards[i].querySelector('.bar i').style.width=Math.max(2,breed.similarity*100).toFixed(1)+'%';
    cards[i].querySelector('span').textContent=`TOP ${i+1} · ${(breed.similarity*100).toFixed(1)}%`;
  });
  $('#resultStatus').textContent=data.mixAssessment;
  const warn=data.oodCount? `有 ${data.oodCount} 张照片触发低置信度提示，综合结果需谨慎参考。` : '输入照片通过模型的基础宠物/已知分布检查。';
  $('#analysisNotice').innerHTML=`<b>真实本地 AI 分析完成</b><p>${warn}<br>${data.disclaimer}</p>`;
}

function renderVisualProfile(data){
  const c=data.consistency;
  $('#consistencyScore').textContent=c.score==null?'单图':`${c.score}%`;
  $('#consistencyLabel').textContent=c.label;
  $('#textureScore').textContent=`${data.traits.textureScore || 0}/100`;
  $('#textureLabel').textContent=data.traits.textureLabel || '无法估算';

  $('#coatPalette').innerHTML=(data.palette||[]).map(p=>`
    <div class="palette-item">
      <i style="background:${p.hex}"></i>
      <div><b>${p.name}</b><span>${p.hex.toUpperCase()} · ${Math.round(p.share*100)}%</span></div>
    </div>`).join('') || '<span class="hint">当前照片无法提取稳定色板</span>';

  $('#traitPills').innerHTML=[
    ['被毛主色',data.traits.coatColor],
    ['物种',data.traits.species],
    ['外观分布',data.mixAssessment],
    ['纹理',data.traits.textureLabel]
  ].map(x=>`<span>${x[0]}：${x[1]}</span>`).join('');

  $('#photoAnalysisList').innerHTML=(data.perPhoto||[]).map((p,i)=>`
    <div class="photo-analysis-row">
      <b>照片 ${i+1}</b>
      <span>${p.topBreed?.name||'—'} · ${p.topBreed?Math.round(p.topBreed.similarity*100):0}%</span>
      <span>宠物区域 ${Math.round(p.petArea*100)}%</span>
      <em class="${p.ood?'warn-dot':'ok-dot'}">${p.ood?'低置信度':'有效'}</em>
    </div>`).join('');
}

function supplementValues(){
  return {
    coatLength:$('#coatLength').value||'未填写',
    eyeColor:$('#eyeColor').value||'未填写',
    earShape:$('#earShape').value||'未填写',
    faceShape:$('#faceShape').value||'未填写'
  };
}

function wrapText(ctx,text,x,y,maxWidth,lineHeight,maxLines=3){
  const chars=String(text).split('');
  let line='',lineNo=0;
  for(const ch of chars){
    const test=line+ch;
    if(ctx.measureText(test).width>maxWidth && line){
      ctx.fillText(line,x,y+lineNo*lineHeight);
      line=ch; lineNo++;
      if(lineNo>=maxLines-1) break;
    }else line=test;
  }
  if(lineNo<maxLines) ctx.fillText(line,x,y+lineNo*lineHeight);
}

function drawIdCard(img,data){
  const c=$('#idCanvas'),x=c.getContext('2d');
  const name=$('#petName').value.trim()||'毛孩子';
  const age=$('#petAge').value.trim()||'未填写';
  const weight=$('#petWeight').value?`${$('#petWeight').value} kg`:'未填写';
  const breed=data?.breeds?.[0];
  x.clearRect(0,0,c.width,c.height);
  const g=x.createLinearGradient(0,0,900,1200);g.addColorStop(0,'#141922');g.addColorStop(.58,'#1d2430');g.addColorStop(1,'#0d1117');
  x.fillStyle=g;x.fillRect(0,0,900,1200);
  x.fillStyle='#6cddb1';x.font='900 50px sans-serif';x.fillText('PawID',64,82);
  x.fillStyle='#fff';x.font='800 24px sans-serif';x.fillText('毛球身份卡 · PET IDENTITY CARD',66,120);
  x.fillStyle='#f2c84b';x.font='900 72px sans-serif';x.fillText(name,64,250);
  x.save();x.beginPath();x.roundRect(64,320,772,500,44);x.clip();
  const side=Math.min(img.naturalWidth,img.naturalHeight),sx=(img.naturalWidth-side)/2,sy=(img.naturalHeight-side)/2;
  x.drawImage(img,sx,sy,side,side,64,320,772,500);x.restore();
  x.fillStyle='#fff';x.font='700 23px sans-serif';
  x.fillText(`物种  ${data?.traits?.species||$('#species').value}`,70,886);
  x.fillText(`年龄  ${age}`,70,928);
  x.fillText(`体重  ${weight}`,70,970);
  x.fillText(`外观最相似  ${breed?breed.name:'待分析'}`,70,1012);
  x.fillStyle='#8fe8c3';x.font='700 18px sans-serif';
  x.fillText(breed?`相似度 ${(breed.similarity*100).toFixed(1)}% · ${data.mixAssessment}`:'',70,1052);
  x.fillText(`被毛 ${data.traits.coatColor} · ${data.traits.textureLabel}`,70,1086);
  x.fillStyle='#9aa8a1';x.font='500 16px sans-serif';
  x.fillText('仅做照片外观相似度分析，不代表纯种 / 混血 / 血统证明',70,1140);
  x.fillText('喵造实验室 008 · PawID v0.3',70,1172);
}

async function drawReport(data){
  const c=$('#reportCanvas'),x=c.getContext('2d'),name=$('#petName').value.trim()||'毛孩子';
  const sup=supplementValues(), top=data.breeds||[], palette=data.palette||[];
  x.clearRect(0,0,900,1200);
  x.fillStyle='#f7f1e6';x.fillRect(0,0,900,1200);
  x.fillStyle='#171b22';x.fillRect(0,0,900,205);
  x.fillStyle='#6cddb1';x.font='900 48px sans-serif';x.fillText('PawID',58,72);
  x.fillStyle='#fff';x.font='900 32px sans-serif';x.fillText('毛球身份鉴定报告',58,119);
  x.fillStyle='#a9b4ae';x.font='500 17px sans-serif';x.fillText('PET IDENTITY REPORT · v0.3',58,155);
  x.fillStyle='#f2c84b';x.font='900 54px sans-serif';x.fillText(name,620,112);

  const portrait=await PawIDAI.makePassport(photos[0].file,data.primary,'#d8f7e9',1024);
  x.save();x.beginPath();x.roundRect(58,245,315,315,30);x.clip();x.drawImage(portrait,58,245,315,315);x.restore();

  x.fillStyle='#171b22';x.font='900 22px sans-serif';x.fillText('AI 外观档案',414,270);
  x.font='700 18px sans-serif';x.fillStyle='#3c4541';
  x.fillText(`物种：${data.traits.species}`,414,316);
  x.fillText(`被毛：${data.traits.coatColor}`,414,352);
  x.fillText(`纹理：${data.traits.textureLabel}`,414,388);
  x.fillText(`外观：${data.mixAssessment}`,414,424);
  x.fillText(`多图一致性：${data.consistency.score==null?'单图':data.consistency.score+'%'}`,414,460);

  x.fillStyle='#6a756f';x.font='600 16px sans-serif';
  x.fillText('主人补充',414,510);
  x.fillText(`毛长 ${sup.coatLength}  ·  眼睛 ${sup.eyeColor}`,414,538);
  x.fillText(`耳型 ${sup.earShape}  ·  脸型 ${sup.faceShape}`,414,566);

  x.fillStyle='#171b22';x.font='900 24px sans-serif';x.fillText('TOP 3 品种外观相似度',58,630);
  top.slice(0,3).forEach((b,i)=>{
    const y=676+i*75, pct=Math.round(b.similarity*100);
    x.fillStyle='#26302c';x.font='800 18px sans-serif';x.fillText(`${i+1}. ${b.name}`,58,y);
    x.fillStyle='#dedfd8';x.beginPath();x.roundRect(335,y-18,430,16,8);x.fill();
    x.fillStyle=i===0?'#55cf9d':i===1?'#f2c84b':'#f29a91';x.beginPath();x.roundRect(335,y-18,Math.max(10,430*b.similarity),16,8);x.fill();
    x.fillStyle='#26302c';x.font='900 17px sans-serif';x.fillText(`${pct}%`,790,y);
  });

  x.fillStyle='#171b22';x.font='900 24px sans-serif';x.fillText('被毛视觉色板',58,912);
  palette.slice(0,3).forEach((p,i)=>{
    const px=58+i*250;
    x.fillStyle=p.hex;x.beginPath();x.arc(px+28,968,28,0,Math.PI*2);x.fill();
    x.strokeStyle='#d4d0c7';x.lineWidth=2;x.stroke();
    x.fillStyle='#26302c';x.font='800 16px sans-serif';x.fillText(p.name,px+66,962);
    x.fillStyle='#7d817c';x.font='500 14px sans-serif';x.fillText(`${p.hex.toUpperCase()} · ${Math.round(p.share*100)}%`,px+66,987);
  });

  x.fillStyle='#fff';x.beginPath();x.roundRect(58,1040,784,95,24);x.fill();
  x.fillStyle='#454d49';x.font='600 15px sans-serif';
  wrapText(x,data.disclaimer,82,1074,730,23,3);
  x.fillStyle='#5da988';x.font='800 14px sans-serif';x.fillText('喵造实验室 008 · 照片本地分析 · 不上传 PawID 服务器',82,1122);
  x.fillStyle='#a89c88';x.font='500 13px sans-serif';x.fillText('生成时间 '+new Date().toLocaleDateString('zh-CN'),58,1172);
}

async function buildPassports(data){
  const grid=$('#passportGrid');grid.innerHTML='';
  for(const [label,bg] of passportColors){
    const c=await PawIDAI.makePassport(photos[0].file,data.primary,bg,1024);
    const wrap=document.createElement('div');wrap.className='passport';wrap.append(c);
    const s=document.createElement('span');s.textContent=label;wrap.append(s);
    wrap.onclick=()=>{const a=document.createElement('a');a.download=`PawID-${$('#petName').value.trim()||'pet'}-${label}.png`;a.href=c.toDataURL('image/png');a.click()};
    grid.append(wrap);
  }
}

async function refreshShareAssets(){
  if(!lastAnalysis || !photos.length)return;
  const img=await loadImg(photos[0].url);
  drawIdCard(img,lastAnalysis);
  await drawReport(lastAnalysis);
}

['coatLength','eyeColor','earShape','faceShape','petName','petAge','petWeight'].forEach(id=>{
  $('#'+id)?.addEventListener('change',()=>refreshShareAssets());
});

$('#analyzeBtn').addEventListener('click',async()=>{
  if(!photos.length){toast('先上传一张毛孩子照片喵');return}
  const btn=$('#analyzeBtn'); btn.disabled=true; btn.textContent='AI 正在分析…';
  try{
    const data=await PawIDAI.analyze(photos.map(p=>p.file),{species:$('#species').value,name:$('#petName').value.trim()},updateAIStatus);
    lastAnalysis=data;
    ['resultPanel','visualPanel','supplementPanel','reportPanel','idPanel','passportPanel'].forEach(id=>$('#'+id).hidden=false);
    renderAnalysis(data); renderVisualProfile(data);
    const img=await loadImg(photos[0].url);
    drawIdCard(img,data);
    await drawReport(data);
    await buildPassports(data);
    $('#resultPanel').scrollIntoView({behavior:'smooth',block:'start'});
    toast('PawID v0.3 身份报告生成完成 😼');
  }catch(err){
    console.error(err);
    $('#aiStatus').textContent='AI 模型加载失败';
    $('#aiProgressText').textContent='请检查网络后重试';
    toast('AI 分析失败：'+err.message);
  }finally{
    btn.disabled=false; btn.innerHTML='重新进行本地 AI 身份分析 <span>→</span>';
  }
});

$('#downloadIdBtn').addEventListener('click',async()=>{
  await refreshShareAssets();
  const a=document.createElement('a');a.download=`PawID-${$('#petName').value.trim()||'pet'}-身份卡.png`;a.href=$('#idCanvas').toDataURL('image/png');a.click();
});

$('#downloadReportBtn').addEventListener('click',async()=>{
  await refreshShareAssets();
  const a=document.createElement('a');a.download=`PawID-${$('#petName').value.trim()||'pet'}-身份鉴定报告.png`;a.href=$('#reportCanvas').toDataURL('image/png');a.click();
});

if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
