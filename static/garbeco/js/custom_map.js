var static = document.getElementById("static").innerHTML
static = static.slice(0, static.length - 1);

var latlng = null;
var user_id = document.getElementById("user_id").innerHTML;
var garbins = [];
var map;
var geocoder;
var marker;
var garbin_info_loaded_id;

function initMap() {
    geocoder = new google.maps.Geocoder;
    map = new google.maps.Map(document.getElementById("map"), {
        center: {lat: 55.7553517, lng: 37.6155363},
        zoom: 10,
    })
    //    var marker = new google.maps.Marker({
    //        position: {lat: 55.7553517, lng: 37.6155363},
    //        map: map,
    //    })

    // loading all garbins from databases. And yeah, i should think of a way to load only necessary bins
    populateMapWithGarbins();


    marker = new google.maps.Marker({map: null});
    var address = "Lorum Ipsum";
    map.addListener("click", function(event) {
        garbin_info_loaded_id = 0;
        latlng = event.latLng;
        marker.setPosition(latlng);
        marker.setMap(map);
        if (user_id != "None") {
            getAddress(geocoder, map, latlng)
                .then(address => loadNewPlaceInfo(address)).catch(error => console.log(error));
        } else {
            depopulate();
            console.info("User is anonymous");
        }

    });

    map.addListener("rightclick", function() {
        garbin_info_loaded_id = null
        depopulate();
        removeMarker();

    })
}

function getAddress(geocoder, map, latlng) {
    let promise = new Promise(function(resolve, reject) {
        geocoder.geocode(
            {'location': latlng},
            function(results, state) {
                if (state == "OK") {
                    // sorting address is done horribly, i'm sorry.
                    console.log(results)
                    let unsorted_address = results[0].address_components
                    let route_found = false;
                    let localty_found = false;
                    let street_number_found = false;
                    let country_found = false;
                    let adm_min = 1000;
                    let subl_min = 1000;
                    var address = {};
                    for (i = 0; i < unsorted_address.length; i++) {
                        let elTypes = unsorted_address[i].types;
                        if (elTypes.includes('route') && !(route_found)) {
                            address['route'] = unsorted_address[i].short_name;
                            route_found = true;
                        } else if (elTypes.includes('street_number') && !(street_number_found)) {
                            address['street_number'] = unsorted_address[i].short_name;
                            street_number_found = true;
                        } else if (elTypes.some(type => {return /administrative_area_level_\d/.test(type)})) {
                            var adm = elTypes.filter(type => /administrative_area_level_\d/.test(type))[0];
                            adm = adm.split('_');
                            if (adm_min > adm[adm.length - 1]) {
                                adm_min = adm[adm.length - 1];
                                address['administrative_area'] = unsorted_address[i].long_name;
                            }
                        } else if (elTypes.some(type => {return /sublocality_level_\d/.test(type)})) {
                            var subl = elTypes.filter(type => /sublocality_level_\d/.test(type))[0];
                            subl = subl.split('_');
                            if (subl_min > subl_min[subl_min.length - 1]) {
                                subl_min = subl_min[subl_min.length - 1];
                                address['sublocality'] = unsorted_address[i].short_name;
                            }
                        } else if (elTypes.includes('country') && !(country_found)) {
                            address['country'] = unsorted_address[i].long_name;
                            country_found = true;
                        }    
                    }
                    resolve(address);
                } else {
                    alert("Geocoding went wrong");
                    reject("Oh no!");
                    removeMarker();
                }
            }
        );
    });
    return promise;
}

function loadNewPlaceInfo(address) { // need Jquery here!
    depopulate();
    var container = document.getElementById("map-card-body");
    var loaded = document.createElement('div');
    loaded.setAttribute('id', 'loaded')
    $.ajax({
        url: '/ajax',
        type: 'get',
        data: {get_id: 'get_garbin_form'},
        success: function(data) {
            var div = document.createElement('div');
            div.setAttribute('id', 'address');
            div.setAttribute('class', 'alert alert-secondary')
            
            for (var key in address) {
                div.innerHTML += "<p id='" + key + "'>" + address[key] + ",</p>";
            }
            loaded.appendChild(div);
            loaded.innerHTML += data;
            var el_to_swap = container.querySelector('#preloaded');
            container.insertBefore(loaded, container.childNodes[0]);

            let list_els = document.getElementById("checkboxes").children;
            for (i = 0; i < list_els.length; i++) {
                // let label = list_els[i].childNodes[0]; useless
                // let text = " " + label.childNodes[1].nodeValue.trim();
                // label.replaceChild(document.createTextNode(text), label.childNodes[1])
                list_els[i].setAttribute('class', 'list-group-item');
                let checkbox = list_els[i].children[0].children[0];
                checkbox.setAttribute('onclick', 'chooseAll(true, this.id)')

                // Нужно доделать
            }

            // inserting 'choose all' checkbox
            let list = document.getElementById('checkboxes');
            var choose_all = document.createElement('input');
            choose_all.setAttribute('type', 'checkbox');
            choose_all.setAttribute('onclick', 'chooseAll(false, this.id)');

            choose_all.setAttribute('id', 'chooseall1');
            let label = document.createElement('label');
            label.setAttribute('for', 'chooseall1');
            text = document.createTextNode(" Выбрать все");
            label.appendChild(choose_all);
            label.appendChild(text);
            let li = document.createElement('li');
            li.setAttribute('class', 'list-group-item');
            li.appendChild(label);
            list.insertBefore(li, list.childNodes[0]);

            // fill lat and lgt hidden forms
            let lat = document.getElementById('id_lat');
            let lng = document.getElementById('id_lng');
            lat.value = latlng.lat();
            lng.value = latlng.lng();

            //trim one bit
            let need_trim = document.getElementById('trim_needed');
            let str = need_trim.innerHTML.trim();
            need_trim.innerHTML = str;
        },
        failure: function(data) {
            alert('Got an error dude');
        }
    });
}

function loadGarbinInfo(garbin_id, event) {
    var latlng = event.latLng;
    console.log(garbin_id, event);
    $.ajax({
        type: 'get',
        url: '/ajax',
        data: {get_id: 'load_garbin_info', 'garbin_id': garbin_id},
        success: function(data) {
            depopulate();
            getAddress(geocoder, map, latlng).then(address => {
                var div = document.createElement('div');
                div.setAttribute('id', 'address');
                div.setAttribute('class', 'alert alert-secondary')
                
                for (var key in address) {
                    div.innerHTML += "<p id='" + key + "'>" + address[key] + ",</p>";
                }

                let card = document.getElementById('map-card-body');
                loaded = document.createElement('div');
                loaded.setAttribute('id', 'loaded');
                loaded.appendChild(div);
                loaded.innerHTML += data;
                card.insertBefore(loaded, card.childNodes[0]);
            }).catch(error => console.error(error));
        },
        error: function(data) {console.error("Could not load garbin info")}
    })
}

function populateMapWithGarbins() {
    $.ajax({
        type: 'get',
        url: '/ajax',
        data: {get_id: 'get_garbins'},
        success: function(data){
            let icon_size = new google.maps.Size(80, 80);
            data_arr = JSON.parse(data);
            for (i = 0; i < data_arr.length; i++) {
                data_el = data_arr[i];
                garbin_marker = addGarbinMarker(data_el);
                garbins.push(garbin_marker);
            }
        },
        error: function(data){
            console.log("Could not import garbins");
        }
    })
}

function deleteGarbin(event) {
    event.preventDefault();
    let csrfmiddlewaretoken = $('#delete-form').serializeArray()[0]['value'];
    $.ajax({
        type: 'post',
        url: '/ajax/',
        data: {'post_id': 'delete_garbin', 'garbin_id': garbin_info_loaded_id, 'csrfmiddlewaretoken': csrfmiddlewaretoken},
        success: function(data) {
            depopulate();
            for (i = 0; i < garbins.length; i++) {
                if (garbins[i].get('id') == garbin_info_loaded_id) {
                    garbins[i].setMap(null);
                    garbin_info_loaded_id = null;
                    index = i;
                    garbins.splice(index, 1);
                    break;
                }
            }
        },
        error: function(data) {
            console.error("Could not delete garbin");
        }
    })
}


function sendGarbinSubmission(event) {
    event.preventDefault();
    let data = $('#garbin-form').serializeArray();
    $.ajax({
        type: 'post',
        url: '/ajax/newgarbin/',
        data: data,
        success: function() {
            depopulate();
            removeMarker();
            let lng; let lat;
            for (i = 0; i < data.length; i++) {
                if (data[i].name == "lat"){
                    lat = data[i].value;
                } else if (data[i].name == "lng") {
                    lng = data[i].value;
                }
            }
            $.ajax({
                type: 'get',
                url: '/ajax',
                data: {"get_id": 'get_new_garbin', "lat": lat, "lng": lng},
                success: function(data){
                    data = JSON.parse(data)[0];
                    garbin_marker = addGarbinMarker(data);
                garbins.push(garbin_marker);
                }, 
                error: function(data){
                    console.error("wow it's not working?");
                }
            })
        },
        error: function(data) {
            error = "Could not import garbins: " + data.responseJSON.error_message;
            console.error(error);
        }
    });
}

function addGarbinMarker(data) {
    let garbin_marker = new google.maps.Marker({
    position: {lat: data['lat'], lng: data['lng']},
    icon: static + data['icon_path'],
    map: map
    });
    garbin_marker.set('id', data.pk);
    garbin_marker.set('types', data.type_names);
    garbin_marker.addListener('click', function(event) {
        if (garbin_info_loaded_id != garbin_marker.get('id')) {
            depopulate(); // need to clean up first
            removeMarker();
            loadGarbinInfo(garbin_marker.get('id'), event);
            garbin_info_loaded_id = garbin_marker.get('id'); 
        }
    });
    return garbin_marker
}

function removeMarker() {
    if (marker.map != null) {
        marker.setMap(null);
        latlng = null;
    }
}

function depopulate() {
    try {
        let map_card = document.getElementById('map-card-body');
        let loaded = document.querySelector('#loaded');
        map_card.removeChild(loaded);
    }
    catch {
        console.error("Cleaning went wrong or it's already clean can't tell i'm blind");
    }
}

function chooseAll(child_checkbox, btn_id) {
    let btn = document.getElementById(btn_id);
    let chk = document.getElementById('chooseall1');
    if (child_checkbox) { // looks disgusting    
        if (chk.checked && !(btn.checked)) {
            let boo = false;
            chk.checked = boo;
        }
    } else {
        let boo;
        if (chk.checked) {
            boo = true;
        } else {
            boo = false;
        }
        let list_els = document.getElementById("checkboxes").children;
        for (i = 0; i < list_els.length; i++) {
            let checkbox = list_els[i].childNodes[0].childNodes[0];
            checkbox.checked = boo;
        } 
    }
}

function collapse() {
    $('.collapse').collapse();
}

function sendLike() {
    event.preventDefault();

    let csrfmiddlewaretoken = $('#like-form').serializeArray()[0]['value'];
    $.ajax({
        type: 'post',
        url: '/ajax/',
        data: {post_id: 'send_like', like_type: 'garbin', submission_id: garbin_info_loaded_id, csrfmiddlewaretoken: csrfmiddlewaretoken},   
        success: function(data) {
            console.info("likes sent", $('#like'));
            $('#like').attr('src', data.image_path);
            $('#likes-amount').html(data.likes_amount);
            console.info("likes sent", $('#like').attr('src'));
        },
        error: function(data) {
            console.error("Liking went wrong")
        }
    })
    return true;
}

function filterChooseAll(child_checkbox, that) {
    let btn = that;
    let chk = document.getElementById('choose-all-filter');
    if (child_checkbox) { // looks disgusting    
        if (chk.checked && !(btn.checked)) {
            let boo = false;
            chk.checked = boo;
        }
    } else {
        let boo;
        if (chk.checked) {
            boo = true;
        } else {
            boo = false;
        }
        let list_els = document.getElementById("filter").children;
        for (i = 0; i < list_els.length - 1; i++) {
            let checkbox = list_els[i].querySelector('input')
            checkbox.checked = boo;
        } 
    }
}

function filterGarbins(event) {
    event.preventDefault();
    let shown_types = []
    let list_els = document.getElementById("filter").children;
    for (i = 1; i < list_els.length - 1; i++) {
        let checkbox = list_els[i].querySelector('input')
        if (checkbox.checked) {
            shown_types.push(checkbox.value);
        }
    }

    for (i = 0; i < garbins.length; i++) {
        garbin = garbins[i];    
        has_type = garbin.get('types').some(type => shown_types.includes(type) );
        if (has_type && garbin.map == null) {
            garbin.setMap(map)
        } else if (!has_type && garbin.map != null) {
            garbin.setMap(null);
        }
    }
}