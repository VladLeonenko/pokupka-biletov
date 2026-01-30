document.addEventListener('DOMContentLoaded', function(){
    var x = 0,
    container = $('.carousel-list'),
    // Поддерживаем как li, так и div элементы (как в оригинале)
    items = container.find('li, div'),
    containerHeight = 71,
    numberVisible = 5, // Показываем 5 элементов
    intervalSec = 3000;

// Поддерживаем как li, так и div элементы
var firstItem = container.find('li:first, div:first');
if(!firstItem.hasClass("first")){
  firstItem.addClass("first");
}

items.each(function(){
  if(x < numberVisible){
    containerHeight = containerHeight + $(this).outerHeight();
    x++;
  }
});

container.css({ height: containerHeight, overflow: "hidden" });
  
function vertCycle() {
  // Поддерживаем как li, так и div элементы
  var firstItem = container.find('li.first, div.first');
  if (firstItem.length === 0) {
    firstItem = container.find('li:first, div:first');
    if (firstItem.length > 0) {
      firstItem.addClass("first");
    } else {
      return;
    }
  }
  
  var firstItemHtml = firstItem.html();
  var tagName = firstItem.prop('tagName').toLowerCase();
    
  container.append('<' + tagName + '>'+firstItemHtml+'</' + tagName + '>');
  firstItem.animate({ marginTop: "-50px"}, 800, function(){  
    $(this).remove(); 
    var nextFirst = container.find('li:first, div:first');
    if (nextFirst.length > 0) {
      nextFirst.addClass("first");
    }
  });
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