
var categories =[
    {
        "id": 1,
        "name": "Small Mazes (5-10)"
    },
    {
        "id": 101,
        "name": "Medium Mazes (10-20)"
    },
    {
        "id": 201,
        "name": "Large Mazes (20-30)"
    },
    {
        "id": 301,
        "name": "Huge Mazes (30+)"
    }
];


var buildCats = function (){
    var sub
    for(var i = 0; i < categories.length; i++){  
        apiClient.getMazesInCategory(categories[i].id, function(resp){
            var count = 1;
            for(var j = 0; j < resp.mazes.length; j++){
                var x = $('<li id="' + resp.mazes[j].mazeno + '"><a href="#">' + resp.mazes[j].displayName + '</a></li>');
                sub = $('#sub' + (count));
                sub.append(x);

                //console.log("Count is " + count);
            }
            //I just did this weird count thing because something bizzare was happening to i
            //I'm assuming it has something to do with the async part of this.
            count++;
        });
    };
};

$(document).ready(function() {
    buildCats();
    $('#left-menu').sidr({
        name: 'sidr', 
        speed: 200, 
        side: 'left',
        source: null, 
        renaming: true, 
        body: 'body'
    });
    
    $('.sub-menu-sidr').hide();

    $("#sidr li:has(ul)").click(function(){
        $("ul",this).toggle('fast');
    });

    $("ul").on('click', 'li', function(){
      var curId = $(this).attr('id');
      console.log("curId is " + curId);
    });

});

