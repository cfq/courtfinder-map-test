var map = undefined;
var markers = [];
var infowindows = [];
var postcodeMap = {};

$(function (){
    initialise_for_postcodes();
});

var initialise_for_postcodes = function () {
    var mapOptions = {
        center: { lat: 54.1147572, lng: -2.7509542 },
        zoom: 7
    };

    map = new google.maps.Map(document.getElementById('court-map'), mapOptions);

    initialiseCourtList();
}

var initialiseCourtList = function(){
    $.getJSON('data/court-lat-lon-postcode.json', function ( data ){
        data.sort(function(a, b){
            if( a['name'].trim() < b['name'].trim() ) return -1;
            if( a['name'].trim() > b['name'].trim() ) return 1;
            return 0;
        });

        for( var i = 0; i < data.length; i++ ){
            var courtName = data[i]['name'];
            var postcodes = data[i]['postcodes'];

            $('#court-list').append($("<option>" + courtName + "</option>"));
            postcodeMap[courtName] = postcodes;
        }

        $('#court-list').change(function (){
            if( !$('#court-list').data('placeholder-removed') ){
                $("#court-list option:first-child").remove();
                $('#court-list').data('placeholder-removed', true);
            }

            var postcodes = postcodeMap[$('#court-list').val()];

            clearMarkers();

            var geocoded = _.filter(postcodes, function ( x ){ return x.lat != null });
            var failed = _.pluck( _.filter(postcodes, function ( x ){ return x.lat == null }), 'postcode');

            _.map(geocoded, plotPostcode);
            postcodesio(failed);
        });
    });
}

var plotPostcode = function ( postcode ){
    addMarker(postcode);
    recentreMap();
}

var postcodesio = function ( postcodes ){
    if( postcodes.length == 0 )
        return false;

    for( var i in postcodes ){
        $.getJSON('https://api.postcodes.io/postcodes/' + postcodes[i] + '/autocomplete?limit=100', function ( autocomplete_response ){
            if( !('result' in autocomplete_response) || autocomplete_response.result == null || autocomplete_response.result.length == 0 )
                return false;

            $.post( 'https://api.postcodes.io/postcodes', { postcodes: autocomplete_response.result }, function ( data ){
                pobjs = _.map(data.result, function (x){ return { lat: x.result.latitude, lon: x.result.longitude, postcode: x.query } });
                _.map( pobjs, plotPostcode );
            });
        });
    }
}

var addMarker = function ( options ){
    if(!('lat' in options) || !('lon' in options)){
        return false;
    }

    var lat   = options['lat'],
        lon   = options['lon'],
        name  = options['name'],
        text  = options['text'];

    if( lat == null || lon == null ){
        return false;
    }

    var marker = new google.maps.Marker({
        position: new google.maps.LatLng( lat, lon ),
        map: map,
        title: name
    });

    if( text != undefined ){
        var infowindow = new google.maps.InfoWindow({
            content: text
        });

        (function (google, map, marker, infowindow){
            google.maps.event.addListener(marker, 'click', function() {
                closeAllInfowindows();

                infowindow.open(map, marker);
            });
        })(google, map, marker, infowindow);

        infowindows.push(infowindow);
    }

    markers.push( marker );
}

var clearMarkers = function (){
    for( var i=0; i<markers.length; i++ ){
        markers[i].setMap(null);
    }
    markers = [];
}

var initialiseForCourtLatLons = function (){
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

            addMarker( court['lat'], court['lon'], court['name'] );
        }

        callback();
    });
}

var recentreMap = _.throttle((function (){
    var bounds = new google.maps.LatLngBounds();
    for( var i = 0; i < markers.length; i++ ){
        bounds.extend( markers[i].position );
    }
    map.fitBounds( bounds );
}), 200);

var closeAllInfowindows = function (){
    for( var i = 0; i < infowindows.length; i++ ){
        infowindows[i].close();
    }
}
