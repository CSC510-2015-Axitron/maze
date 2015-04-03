
$(function() {
    var client = new Keen({
        projectId: "551ad76c59949a707edddefa",
        readKey: "b877724bb5aff94e21199fea36a46cdc3ef29a4aa2b2e1ada13ecc6709fa83d9f9c0b2c0c0ad1e938c1bdcaad902f94b8a7c815a4b97d0c8a2765acc15e452752b134081a095e68b54419d92138581ab36e3c38973dc8025bb4b656940b890e5de4a81f44742f9260563e534f56463fc",
        protocol: "https",
        host: "api.keen.io/3.0",
        requestType: 'beacon'
    });
    
    Keen.ready(function(){
        var liked_hand = new Keen.Query("count", {
            eventCollection: 'sentiment',
            groupBy: 'liked',
            filters: [
                {
                    "property_name" : "item",
                    "operator": "eq",
                    "property_value": "Hand Written"
                }
            ]
        }),
        liked_proc = new Keen.Query("count", {
            eventCollection: 'sentiment',
            groupBy: 'liked',
            filters: [
                {
                    "property_name" : "item",
                    "operator" : "eq",
                    "property_value" : "Procedurally Generated"
                }
            ]
        });

        client.draw(liked_hand, document.getElementById("likes-hand-chart"), {
            chartType: "piechart",
            title: "Likes - Hand Written",
            height: 500,
            width: 500
        });
        client.draw(liked_proc, document.getElementById("likes-proc-chart"), {
            chartType: "piechart",
            title: "Likes - Proc. Generated",
            height: 500,
            width: 500
        });
    });
    
});
