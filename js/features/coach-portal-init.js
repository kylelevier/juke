(function(){
  var auth=null;
  try{auth=JSON.parse(localStorage.getItem('juke_auth'));}catch(e){}
  if(!auth||!auth.name){location.replace('login.html');return;}
  var portals={athlete:'juke.html',college_coach:'coach.html',hs_coach:'hscoach.html'};
  if(auth.profiles&&auth.profiles.length){
    var apid=auth.activeProfileId||auth.profiles[0].id;
    var ap=auth.profiles.find(function(p){return p.id===apid;})||auth.profiles[0];
    if(ap.type!=='college_coach'){location.replace(portals[ap.type]||'login.html');return;}
    return;
  }
  if(!auth.type){location.replace('login.html');return;}
  if(auth.type!=='college_coach'){location.replace(portals[auth.type]||'login.html');return;}
})();