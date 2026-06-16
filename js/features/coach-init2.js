document.addEventListener('click',function(e){
  var sw=document.getElementById('role-switcher');
  if(sw&&!sw.contains(e.target))document.getElementById('rs-menu').classList.remove('open');
});