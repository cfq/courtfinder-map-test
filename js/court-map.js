var map = undefined;
var markers = [];
var infowindows = [];

$(function (){
    initialise();
});

var initialise = function (){
    var mapOptions = {
        center: { lat: 54.1147572, lng: -2.7509542 },
        zoom: 10
    };

    map = new google.maps.Map(document.getElementById('court-map'), mapOptions);

    addMarkers( recentreMap );
}

var addMarkers = function ( callback ){
    $.getJSON('data/court-lat-lon.json', function ( data ){
        for( var i = 0; i < data.length; i++ ){
            court = data[i];

            var marker = new google.maps.Marker({
                position: new google.maps.LatLng( court['lat'], court['lon'] ),
                map: map,
                title: court['name']
            });

            var infowindow = new google.maps.InfoWindow({
                content: court['name']
            });

            (function (google, map, marker, infowindow){
                google.maps.event.addListener(marker, 'click', function() {
                    closeAllInfowindows();

                    infowindow.open(map, marker);
                });
            })(google, map, marker, infowindow);

            markers.push( marker );
            infowindows.push(infowindow);
        }

        callback();
    });
}

var recentreMap = function (){
    var bounds = new google.maps.LatLngBounds();
    for( var i = 0; i < markers.length; i++ ){
        bounds.extend( markers[i].position );
    }
    map.fitBounds( bounds );
}

var closeAllInfowindows = function (){
    for( var i = 0; i < infowindows.length; i++ ){
        infowindows[i].close();
    }
}
