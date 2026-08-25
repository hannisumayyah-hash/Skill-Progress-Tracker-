const STORAGE_KEY="skillProgressTracker.activities.v1";
const $=id=>document.getElementById(id);

let activities=loadActivities();

function today(){return new Date().toISOString().slice(0,10)}
$("activityDate").value=today();

function loadActivities(){
  try{
    const saved=localStorage.getItem(STORAGE_KEY);
    if(saved) return JSON.parse(saved);
  }catch(e){}
  return [];
}

function saveActivities(){
  localStorage.setItem(STORAGE_KEY,JSON.stringify(activities));
}

function esc(value){
  return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}

function monthActivities(){
  const now=new Date();
  return activities.filter(a=>{
    const d=new Date(a.date+"T00:00:00");
    return d.getMonth()===now.getMonth() && d.getFullYear()===now.getFullYear();
  });
}

function switchPage(page){
  document.querySelectorAll(".nav-btn").forEach(b=>b.classList.toggle("active",b.dataset.page===page));
  document.querySelectorAll(".page").forEach(p=>p.classList.toggle("active",p.id===page));
  render();
}

document.querySelectorAll(".nav-btn").forEach(btn=>{
  btn.addEventListener("click",()=>switchPage(btn.dataset.page));
});

$("quickAdd").addEventListener("click",()=>{
  switchPage("record");
  $("skill").focus();
});

$("clearForm").addEventListener("click",()=>{
  $("activityForm").reset();
  $("activityDate").value=today();
});

$("activityForm").addEventListener("submit",e=>{
  e.preventDefault();
  const skill=$("skill").value.trim();
  const topic=$("topic").value.trim();
  const minutes=Math.max(1,Math.min(1440,Number($("minutes").value)||1));
  if(!skill||!topic)return;

  activities.unshift({
    id:Date.now(),
    date:$("activityDate").value||today(),
    skill,topic,minutes,
    difficulty:Number($("difficulty").value),
    progress:$("progressType").value,
    notes:$("notes").value.trim()
  });

  saveActivities();
  $("activityForm").reset();
  $("activityDate").value=today();
  showToast("Activity saved");
  switchPage("dashboard");
});

function showToast(text){
  const old=document.querySelector(".toast"); if(old)old.remove();
  const t=document.createElement("div");t.className="toast";t.textContent=text;document.body.appendChild(t);
  setTimeout(()=>t.remove(),2200);
}

function render(){
  const items=monthActivities();
  const groups={};
  items.forEach(a=>{
    const key=a.skill.trim();
    groups[key]??=[];
    groups[key].push(a);
  });

  $("sessionCount").textContent=items.length;
  $("skillCount").textContent=Object.keys(groups).length;

  const mins=items.reduce((s,a)=>s+a.minutes,0);
  $("practiceTime").textContent=(mins/60).toFixed(mins%60?1:0)+"h";

  const focus=Object.entries(groups).sort((a,b)=>b[1].length-a[1].length)[0];
  $("mainFocus").textContent=focus?focus[0]:"—";

  if(!Object.keys(groups).length){
    $("skillProgress").innerHTML='<div class="empty">Start recording activities.</div>';
    $("quickInsight").innerHTML='<div class="insight"><strong>Welcome</strong><span>Record your first activity to start building your progress history.</span></div>';
  }else{
    $("skillProgress").innerHTML=Object.entries(groups).map(([name,list])=>{
      const avg=Math.round(list.reduce((s,a)=>s+a.difficulty,0)/list.length*20);
      const total=list.reduce((s,a)=>s+a.minutes,0);
      return `<div class="skill"><div class="skill-head"><div><div class="skill-name">${esc(name)}</div><div class="skill-meta">${list.length} session${list.length===1?"":"s"} · ${total} min</div></div><div class="percent">${avg}%</div></div><div class="track"><div class="fill" style="width:${avg}%"></div></div></div>`;
    }).join("");

    const learned=items.filter(a=>a.progress==="Learned something new").length;
    const improved=items.filter(a=>a.progress==="Improved an existing skill").length;
    $("quickInsight").innerHTML=`
      <div class="insight"><strong>Your main focus</strong><span>${esc(focus[0])} accounts for ${focus[1].length} session${focus[1].length===1?"":"s"} this month.</span></div>
      <div class="insight"><strong>Learning progress</strong><span>${learned} new thing${learned===1?"":"s"} learned and ${improved} improvement${improved===1?"":"s"} recorded.</span></div>`;
  }

  renderHistory();
  renderReview();
}

function renderHistory(){
  const box=$("activityList");
  if(!activities.length){
    box.innerHTML='<div class="empty">No activities recorded yet.</div>';
    return;
  }
  box.innerHTML=activities.map((a,i)=>`
    <div class="activity">
      <div class="activity-top">
        <div>
          <span class="tag">${esc(a.skill)}</span>
          <h3>${esc(a.topic)}</h3>
          <div class="activity-meta">${esc(a.date)} · ${a.minutes} min · <span class="stars">${"★".repeat(a.difficulty)}${"☆".repeat(5-a.difficulty)}</span></div>
        </div>
        <button class="delete" data-index="${i}">Delete</button>
      </div>
      <div class="activity-note"><b>${esc(a.progress)}</b>${a.notes?" · "+esc(a.notes):""}</div>
    </div>`).join("");

  box.querySelectorAll(".delete").forEach(btn=>{
    btn.addEventListener("click",()=>{
      const i=Number(btn.dataset.index);
      if(confirm("Delete this activity?")){
        activities.splice(i,1);
        saveActivities();
        render();
      }
    });
  });
}

function renderReview(){
  const items=monthActivities();
  const mins=items.reduce((s,a)=>s+a.minutes,0);
  const skills=[...new Set(items.map(a=>a.skill.trim()))];
  const learned=items.filter(a=>a.progress==="Learned something new");
  const improved=items.filter(a=>a.progress==="Improved an existing skill");
  const milestones=items.filter(a=>a.progress==="Completed a milestone");

  if(!items.length){
    $("reviewContent").innerHTML=`<div class="review-hero"><div class="eyebrow">MONTHLY REFLECTION</div><h2>Nothing to review yet.</h2><p>Record a few activities and this space will turn them into a clear progress story.</p></div>`;
    return;
  }

  $("reviewContent").innerHTML=`
    <div class="review-hero">
      <div class="eyebrow">MONTHLY REFLECTION</div>
      <h2>Your progress this month.</h2>
      <p>You recorded ${items.length} session${items.length===1?"":"s"} across ${skills.length} skill${skills.length===1?"":"s"}, with ${mins} minutes of focused practice.</p>
    </div>
    <div class="review-grid">
      <div class="review-card"><h3>New skills & knowledge</h3><ul>${learned.length?learned.map(a=>`<li><b>${esc(a.skill)}</b> — ${esc(a.topic)}</li>`).join(""):"<li>Nothing marked as newly learned yet.</li>"}</ul></div>
      <div class="review-card"><h3>Skills you improved</h3><ul>${improved.length?improved.map(a=>`<li><b>${esc(a.skill)}</b> — ${esc(a.topic)}${a.notes?" · "+esc(a.notes):""}</li>`).join(""):"<li>Nothing marked as improved yet.</li>"}</ul></div>
      <div class="review-card"><h3>Milestones</h3><ul>${milestones.length?milestones.map(a=>`<li><b>${esc(a.skill)}</b> — ${esc(a.topic)}</li>`).join(""):"<li>No milestones recorded yet.</li>"}</ul></div>
      <div class="review-card"><h3>Next focus</h3><ul><li>Continue your most consistently practiced skill.</li><li>Record specific improvements, not just practice time.</li><li>Use milestones for meaningful achievements.</li></ul></div>
    </div>`;
}

render();
