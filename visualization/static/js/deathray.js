
$(function() {

    var show_data_list = 1,
        first = 1,
        call_database = 1,
        deathray_on = 0;

    client_data();
    var snd = new Audio("static/sound/sweep-background-02.wav"); // buffers automatically when created


    function client_data() {
        $.ajax({
            url: 'deathray/clients/',
            type: 'GET',
            success: function (data) {
                rotate();
                // list the data in the sidebar
                $(".data_2 ul").html('');
                $('.device').remove;
                $.each(data, function(id, client) {

                    var local_id = client.mac.toString().replace(/\:/g, '');
                    seen_list_device(local_id, client.mac, client.probes);
                });

                // get angle and power data for each client
                $.each(data, function(id, client) {

                    $.ajax({
                        url: 'deathray/client/'+client.mac,
                        type: 'GET',
                        success: function (one_client) {
                            paint(one_client);
                            // indicator(power, local_id, angle, mac);
                        }

                    });

                });

            }

        });

        if ( call_database == 1 ) {
            setTimeout (function () {
                client_data();
            }, 15000);
        }
    }


    function paint(one_client) {
        one_client = one_client.client;
        var angle = one_client.angle,
            mac = one_client.mac,
            power = (one_client.power * -1);
            console.log(one_client.time);


        // create a local id for local storage
        local_id = mac.toString().replace(/\:/g, '');

        // if angel not defined, give angle a random number form 0 - 360
        if (!angle) {
            console.log('null angel found');
            return;
            var angle = Math.floor((Math.random()*360)+1);
        }

        if (!power) {
            var power = Math.floor((Math.random()*100)+1);
        }

        console.log(angle);

        // on start up clear local storage
        if(first == 1) {
            localStorage.clear();
            first = 0;
        }
        // store or update the device to local storage
        store_device(local_id, angle, mac, power);
    }


    function updateContent() {
        // make json request to api /json

            // call this function after 10 sec if database call is on.
            if ( call_database == 1 ) {
            setTimeout (function () {
                updateContent();
            }, 5000);
        }

    }


    function store_device(local_id, angle, bssid, power) {
        var device = localStorage.getItem(local_id);
        if (device) {
            var json_d = $.parseJSON(device);
            // remove current circle if values has changed and update values
            if ( json_d['power'] != power ) { // add this when angel is more stable "json_d['angle'] != angle ||"
                var el = $("#visual_"+local_id);
                $(el).remove();
                set_device(local_id, angle, bssid, power)
            }
        } else {
            // if it's a new device store it in local storage
            set_device(local_id, angle, bssid, power)
        }
    }

    // if it's a new device or if you update the values in local storage
    function set_device(local_id, angle, bssid, power) {
        localStorage.setItem(local_id,
        '{"id":"'+local_id+'", ' +
            '"mac" :"'+bssid+'", ' +
            '"angle" :"'+angle+'", '+
            '"power" :"'+power+'"}');
        // also list and show device
        // prepend it to the device list
        list_device(local_id, bssid, angle, power)
        // show it in the visualization
        indicator(power, local_id, angle, bssid);
    }

    // list device in in device list and make a hidden li to be show on click of circle
    function list_device(local_id, bssid, angle, power) {

        $(".data ul").append('<li id="detail_'+local_id+'" ' +
            'class="device_info">' +
            'Mac: '+bssid+'<br/>' +
            'Power: '+power+' | ' +
            'Angle: ' +angle+'<br/><br/>' +
            '<button id="'+local_id+'" name="'+bssid+'" class="ath0">ath0</button>'+
            '</li>');

    }

    function seen_list_device(local_id, mac, probes) {
        // building a string from probes

        if (probes.length < 1) {

        } else {
        mac = mac.substring(0,2) +'::'+ mac.substring(15,17) ;
        var allprobes = '[ ';
        var foundnetname = false;
        $.each(probes,
            function(key, value)  {
                if (value != "homerun" && value != "homerun1x" && value != "Konsthallen") {
                    allprobes = allprobes + ' ' + value + ' ' ;
                    foundnetname = true;
                }
            });
        allprobes = allprobes + ' ]'

        if (foundnetname) {
            var row = $('<li class="listing" id="list_'+local_id+'">' +
                ''+mac+' ' +
                '<span class="probes"></span> ' +
                '<br/><br/></li>');
            row.find(".probes").text(allprobes);
            $(".data_2 ul").append(
                row
            );

            $('.data_2').scrollTop(1000000)
        }
        }
    }

    // find out the x and y coordinates relative to top and left
    function x_y_from_angel(angle, power) {
        var ang = ((-1)*angle)*1.35 -90;

        var x = parseInt((46 * (power/10)) * Math.cos((ang/ 180) * 3.14))*(1);
        var y = parseInt((46 *  (power/10)) * Math.sin((ang / 180) * 3.14));

        //var x = parseInt((46 * (power/10)) * Math.cos(angle /  100*3.14/2+3.14/2));
        //var y = parseInt((46 *  (power/10)) * Math.sin(angle / 100*3.14/2+3.14/2)*-1);
        return { 'x':x, 'y':y }
    }

    // display a circle size and position depending on power and angle
    function indicator(power, local_id, angle, mac){

        var x_y =  x_y_from_angel(angle, power);
        var x = x_y.x
        var y = x_y.y
        if (power > 79) {
            var level = "highest",
                size = 100,
                color = "red";
        } else if (power > 60) {
            var level = "high",
                size = 70,
                color = "#ff6e00";
        } else if (power > 40) {
            var level = "medium",
                size = 40,
                color = "#f6e016";
        } else if (power > 20) {
            var level = "low",
                size = 32,
                color = "#0051ff";
        } else {
            var level = "minor",
                size = 16,
                color = "#22ff00";
        }
        $('<div></div>').css({
            position: "absolute",
            opacity: "0.9",
            top: "500px",
            left: "500px",
            zIndex: "100",
            cursor: "pointer",
            boxShadow: "0px 0px 10px #22ff00",
            width: size+"px",
            height: size+"px",
            color: "white",
            backgroundColor: color,
            fontcolor: "#FFFFFF",
            borderRadius: size/2+"px",
            marginLeft: x,
            marginTop: y
        }).attr({"id": 'visual_'+local_id, "class": 'device', 'name': local_id}).html(mac).appendTo('.container');

        device_info();
    }

    // show data about device if click on circle
    function device_info() {
        $('.device').click(function(e){
            $('.device').css({outlineStyle: "none", border:"none"});
            $(this).css({outlineStyle: "dashed", border:"3px solid black"});
            $('.device_info').hide();
            var id = e.target.id;
            var name = $('#'+id).attr('name')
            overlay = $('#detail_'+name).show();
            $(".device_corner").html('');
            overlay.appendTo($('.device_corner'));

        });
        ath0();
    }

    call_data_on_off();

    // turn of and the ajax call
    function call_data_on_off() {
        $('.call_off').hide();
        $('.call_on').click(function(e){
            $('.call_on').hide();
            $('.call_off').show();
            call_database = 1;
        });
        $('.call_off').click(function(e){
            $('.call_off').hide();
            $('.call_on').show();
            call_database = 0;
        });

    }

    //
    function ath0() {
        $('.ath0').click(function(e){
            var id = e.target.id;
            var name = $('#'+id).attr('name')
            $.ajax({
                url:"ath0/"+name
            }).done(function ( data ) {
                   console.log(data)
            });
        });
    }

    server_console();
    function server_console() {
        $(".command").keydown(function(e){
            if(e.keyCode == 13) {
                var command = $('.command').val()
            e.preventDefault();
            $.ajax({
                url:"console/"+command

            }).done(function ( data ) {
                $(".data_3 ul").append('<li>' +
                    data +
                    '</li>');
                });
            $('.command').val('');
            $('.data_3').scrollTop(1000000)
            }
        });
    }


    var degree = 0, // starting position
        timer,
        speed = 10, // update rate in milli sec. higher is slower
        length = 10;

    // rotation indicator TODO: crome fix
    function rotate() {
        $element = $('#meter'),
        $element.show();
        $element.css({ 'WebkitTransform': 'rotate(' + degree + 'deg)'});
        $element.css({ '-moz-transform': 'rotate(' + degree + 'deg)'});
        snd.play();

        timer = setTimeout(function() {
            degree = degree + length;
            if (degree > 350) {
                $('#meter').hide();
                degree = 0;
            }
            else
                rotate();
        },speed);
    }


    function list_devices(num) {
        len=localStorage.length
        if (show_data_list == 1) {

            for(var i=num; i<len; i++) {
                var key = localStorage.key(i);
                var value = $.parseJSON(localStorage[key]);

                $(".data ul").append('<li id="detail_'+value['id']+'" ' +
                    'class="device_info">Device ' +
                    'Id: '+value['mac']+'<br/>' +
                    'Power: '+value['power']+'<br/>' +
                    'Angel: ' +value['angle']+'<br/><br/>' +
                    '<button>nmap</button>' +
                    '<button>disassociate</button>'+
                    '<button>upsidedownternet</button><br/>' +
                    '</li>');
                var x_y =  x_y_from_angel(value['angle'], value['power']);
                // show visualization
                indicator(x_y, value['power'], value['id'], value['angle'], value['mac']);
            }

        }
    }

});
