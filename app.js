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
  data.breeds.slice(0,3).forEach((breed,i)=>{
    if(!cards[i])return;
    cards[i].classList.remove('ghost');
    cards[i].querySelector('b').textContent=breed.name;
    cards[i].querySelector('.bar i').style.width=Math.max(2,breed.similarity*100).toFixed(1)+'%';
    cards[i].querySelector('span').textContent=`TOP ${i+1} · ${(breed.similarity*100).toFixed(1)}%`;
  });
  const t=data.traits||{};
  $('.traits').innerHTML=[
    ['被毛主色（估算）',t.coatColor],
    ['物种',t.species],
    ['外观分布',data.mixAssessment],
    ['模型范围','37 品种']
  ].filter(x=>x[1]).map(x=>`<span>${x[0]}：${x[1]}</span>`).join('');
  $('#resultStatus').textContent=data.mixAssessment;
  const warn=data.oodCount? `有 ${data.oodCount} 张照片触发低置信度提示，综合结果需谨慎参考。` : '输入照片通过模型的宠物/已知分布基础检查。';
  $('#analysisNotice').innerHTML=`<b>真实本地 AI 分析完成</b><p>${warn}<br>${data.disclaimer}</p>`;
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
  x.save();x.beginPath();x.roundRect(64,320,772,520,44);x.clip();
  const side=Math.min(img.naturalWidth,img.naturalHeight),sx=(img.naturalWidth-side)/2,sy=(img.naturalHeight-side)/2;
  x.drawImage(img,sx,sy,side,side,64,320,772,520);x.restore();
  x.fillStyle='#fff';x.font='700 24px sans-serif';
  x.fillText(`物种  ${data?.traits?.species||$('#species').value}`,70,912);
  x.fillText(`年龄  ${age}`,70,958);
  x.fillText(`体重  ${weight}`,70,1004);
  x.fillText(`外观最相似  ${breed?breed.name:'待分析'}`,70,1050);
  x.fillStyle='#8fe8c3';x.font='700 19px sans-serif';
  x.fillText(breed?`相似度 ${(breed.similarity*100).toFixed(1)}% · ${data.mixAssessment}`:'',70,1090);
  x.fillStyle='#9aa8a1';x.font='500 17px sans-serif';
  x.fillText('仅做照片外观相似度分析，不代表纯种 / 混血 / 血统证明',70,1140);
  x.fillText('喵造实验室 008 · PawID v0.2',70,1172);
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

$('#analyzeBtn').addEventListener('click',async()=>{
  if(!photos.length){toast('先上传一张毛孩子照片喵');return}
  const btn=$('#analyzeBtn'); btn.disabled=true; btn.textContent='AI 正在分析…';
  try{
    const data=await PawIDAI.analyze(
      photos.map(p=>p.file),
      {species:$('#species').value,name:$('#petName').value.trim()},
      updateAIStatus
    );
    lastAnalysis=data;
    $('#resultPanel').hidden=false;$('#idPanel').hidden=false;$('#passportPanel').hidden=false;
    renderAnalysis(data);
    const img=await loadImg(photos[0].url);
    drawIdCard(img,data);
    await buildPassports(data);
    $('#resultPanel').scrollIntoView({behavior:'smooth',block:'start'});
    toast('真实 AI 分析完成 😼');
  }catch(err){
    console.error(err);
    $('#aiStatus').textContent='AI 模型加载失败';
    $('#aiProgressText').textContent='请检查网络后重试';
    toast('AI 分析失败：'+err.message);
  }finally{
    btn.disabled=false; btn.innerHTML='重新进行本地 AI 分析 <span>→</span>';
  }
});

$('#downloadIdBtn').addEventListener('click',()=>{
  const a=document.createElement('a');a.download=`PawID-${$('#petName').value.trim()||'pet'}-身份卡.png`;a.href=$('#idCanvas').toDataURL('image/png');a.click();
});

if('serviceWorker' in navigator)navigator.serviceWorker.register('./sw.js').catch(()=>{});
