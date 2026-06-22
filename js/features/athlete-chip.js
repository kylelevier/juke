// ── ATHLETE USER CHIP ────────────────────────────────────
// Renders the header avatar/name chip with profile-switcher dropdown.
// Loaded on athlete.html only. Coach portals have their own chip implementations.
(function(){
  var auth=null;
  try{auth=JSON.parse(localStorage.getItem('juke_auth'));}catch(e){}
  if(!auth) return;
  var chip=document.getElementById('juke-user-chip');
  if(!chip) return;
  var parts=auth.name.trim().split(' ');
  var inits=(parts[0][0]+(parts.length>1?parts[parts.length-1][0]:'')).toUpperCase();
  var RL={athlete:'Athlete',college_coach:'Recruiter',hs_coach:'Coach'};
  // Active profile for header subtitle
  var activeProfile=null;
  if(auth.profiles&&auth.profiles.length){
    var apid=auth.activeProfileId||auth.profiles[0].id;
    activeProfile=auth.profiles.find(function(p){return p.id===apid;})||auth.profiles[0];
  }
  var roleOrg=activeProfile&&activeProfile.org?'Athlete · '+activeProfile.org:'Athlete';
  // Build profiles section
  var profilesHTML='';
  if(auth.profiles&&auth.profiles.length){
    profilesHTML+='<div class="juke-chip-dd-divider"></div><div class="juke-chip-dd-section">';
    auth.profiles.forEach(function(p){
      var isA=p.id===(auth.activeProfileId||'');
      profilesHTML+='<button class="juke-chip-dd-profile'+(isA?' is-active':'')+'"'
        +(isA?'':' onclick="switchProfile(\''+p.id+'\')"')+'>'
        +'<span class="jcp-dot'+(isA?' on':'')+'"></span>'
        +'<span class="jcp-info"><span class="jcp-org">'+(p.org||RL[p.type]||p.type)+'</span><span class="jcp-role">'+(RL[p.type]||p.type)+'</span></span>'
        +(isA?'<span class="jcp-check">✓</span>':'')
        +'</button>';
    });
    profilesHTML+='</div>';
  }
  chip.innerHTML=
    '<div class="juke-user-av">'+inits+'</div>'
    +'<span class="juke-user-name">'+parts[0]+'</span>'
    +'<div class="juke-chip-dd" id="juke-chip-dd">'
      +'<div class="juke-chip-dd-header">'
        +'<div class="juke-chip-dd-name">'+auth.name+'</div>'
        +'<div class="juke-chip-dd-role">'+roleOrg+'</div>'
      +'</div>'
      +profilesHTML
      +'<div class="juke-chip-dd-section">'
        +'<button class="juke-chip-dd-item" onclick="location.href=\'../preview.html\'">+ Add Account</button>'
      +'</div>'
      +'<div class="juke-chip-dd-divider"></div>'
      +'<button class="juke-chip-dd-item juke-chip-dd-logout" onclick="jukeLogout()">Log Out</button>'
    +'</div>';
  chip.style.display='flex';
  chip.addEventListener('click',function(e){
    if(e.target.closest('.juke-chip-dd')) return;
    document.getElementById('juke-chip-dd').classList.toggle('open');
  });
  document.addEventListener('click',function(e){
    if(!e.target.closest('#juke-user-chip')){
      var dd=document.getElementById('juke-chip-dd');
      if(dd) dd.classList.remove('open');
    }
  });
})();

function switchProfile(profileId){
  try{
    var auth=JSON.parse(localStorage.getItem('juke_auth'));
    if(!auth) return;
    auth.activeProfileId=profileId;
    localStorage.setItem('juke_auth',JSON.stringify(auth));
    var p=auth.profiles.find(function(x){return x.id===profileId;});
    if(!p) return;
    var portals={athlete:'athlete.html',college_coach:'coach.html',hs_coach:'hscoach.html'};
    location.href=portals[p.type]||'../preview.html';
  }catch(e){}
}

function jukeLogout(){localStorage.removeItem('juke_auth');location.href='../preview.html';}
