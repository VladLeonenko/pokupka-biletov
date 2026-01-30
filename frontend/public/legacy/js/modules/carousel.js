document.addEventListener('DOMContentLoaded', function(){
    var x = 0,
    container = $('.carousel-list'),
    items = container.find('li'),
    containerHeight = 71,
    numberVisible = 3,
    intervalSec = 3000;

if(!container.find('li:first').hasClass("first")){
  container.find('li:first').addClass("first");
}

items.each(function(){
  if(x < numberVisible){
    containerHeight = containerHeight + $(this).outerHeight();
    x++;
  }
});

container.css({ height: containerHeight, overflow: "hidden" });
  
function vertCycle() {
  var firstItem = container.find('li.first').html();
    
  container.append('<li>'+firstItem+'</li>');
  firstItem = '';
  container.find('li.first').animate({ marginTop: "-50px"}, 800, function(){  $(this).remove(); container.find('li:first').addClass("first"); });
}

if(intervalSec < 700){
  intervalSec = 700;
}

var init = setInterval("vertCycle()",intervalSec);

container.hover(function(){
  clearInterval(init);
}, function(){
  init = setInterval("vertCycle()",intervalSec);
});

})