(function(){
  var auth=null;
  try{auth=JSON.parse(localStorage.getItem('juke_auth'));}catch(e){}
  if(!auth||!auth.name) return;
  var portals={athlete:'/athlete',college_coach:'/coach',hs_coach:'/hscoach'};
  if(auth.profiles&&auth.profiles.length){
    var apid=auth.activeProfileId||auth.profiles[0].id;
    var ap=auth.profiles.find(function(p){return p.id===apid;})||auth.profiles[0];
    if(ap.type!=='college_coach'){location.replace(portals[ap.type]||'../preview.html');return;}
    return;
  }
  if(!auth.type) return;
  if(auth.type!=='college_coach'){location.replace(portals[auth.type]||'../preview.html');return;}
})();
