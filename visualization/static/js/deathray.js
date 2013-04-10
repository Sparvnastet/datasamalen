
$(function() {

    var show_data_list = 1,
        first = 1,
        call_database = 1;

    updateContent();
    var snd = new Audio("static/sound/sweep-background-02.wav"); // buffers automatically when created


        $.ajax({
            dataType: 'jsonp',
            //jsonp: '',
            url: 'http://localhost:28017/deathray/clients/',
            type: 'GET',
            crossDomain: true,
            //contentType: "text/plain",
            success: function (data) {
                console.log(data)
            }
        });

        function updateContent() {
        // make json request to api /json
        $.ajax({
            url:"json",
            beforeSend: function ( xhr ) {
            }
            }).done(function ( data ) {
                rotate();
                $.each(data, function(id, device) {

                    var _id = device.id,
                    angle = device.angle,
                    mac = device.mac,
                    power = device.power,

                    // create a local id for local storage
                    local_id = mac.toString().replace(/\:/g, '');

                    // if angel not defined, give angle a random number form 0 - 360
                    if (!angle) {
                        var angle = Math.floor((Math.random()*360)+1);
                    }

                    // on start up clear local storage
                    if(first == 1) {
                        localStorage.clear();
                        first = 0;
                    }
                    // store or update the device to local storage
                    store_device(local_id, angle, mac, power);

                });

            // call this function after 10 sec if database call is on.
            if ( call_database == 1 ) {
            setTimeout (function () {
                updateContent();
            }, 5000);
            }
        });
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
        indicator(power, local_id, angle);
    }

    // list device in in device list and make a hidden li to be show on click of circle
    function list_device(local_id,  bssid, angle, power) {
        $(".data ul").append('<li id="detail_'+local_id+'" ' +
            'class="device_info">' +
            'Bssid: '+bssid+'<br/>' +
            'Power: '+power+' | ' +
            'Angel: ' +angle+'<br/><br/>' +
            '<button id="'+local_id+'" name="'+bssid+'" class="ath0">ath0</button>'+
            '</li>');

        $(".data_2 ul").prepend('<li class="listing" id="list_'+local_id+'">' +
            '[ '+bssid+
            ' ] '+power+
            '</li>');

    }

    // find out the x and y coordinates relative to top and left
    function x_y_from_angel(angle, power) {
        var x = parseInt((46 * (power/10)) * Math.cos(angle / 60));
        var y = parseInt((46 *  (power/10)) * Math.sin(angle / 60)*-1);
        return { 'x':x, 'y':y }
    }

    // display a circle size and position depending on power and angle
    function indicator(power, local_id, angle){
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
            backgroundColor: color,
            fontcolor: "#FFFFFF",
            borderRadius: size/2+"px",
            marginLeft: x,
            marginTop: y
        }).attr({"id": 'visual_'+local_id, "class": 'device', 'name': local_id}).html(angle+':'+power).appendTo('.container');

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
            $('#detail_'+name).show();
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
                indicator(x_y, value['power'], value['id'], value['angle']);
            }

        }
    }

});
