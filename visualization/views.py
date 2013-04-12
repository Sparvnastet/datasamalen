from flask import render_template, Blueprint, jsonify, request
from visualization import app
from visualization.models import Device, Clients
from visualization.mock_data import *
from fabric.api import local
from datetime import datetime, timedelta
from datasamalen.datasamalen import get_clients_db, remove_all_clients, get_client_last_observation, init_db


devices = Blueprint('devices', __name__, template_folder='templates')

@app.route('/')
def hello():
    return render_template('index.html')


@app.route('/json', methods = ['GET'])
def api_root():
    if request.method == 'GET':
        devices = Device.objects.all().order_by('-_id')[:20]

        devices_data = {}
        for d in devices:
            id = str(d.id)
            time = d.time.strftime('%H:%M')

            devices_data[d.mac] = {'time':time, 'power':d.power, 'mac':d.mac, 'id':id}

        resp = jsonify(devices_data)
        resp.status_code = 200

        return resp


@app.route('/deathray/clients/', methods = ['GET'])
def clients():
    if request.method == 'GET':
        clients = get_clients_db()
        clients = clients.find()
        clients_data = {}
        db = init_db()

        for c in clients:

            client = get_client_last_observation(c['mac'], db)

            if client:
                now = datetime.utcnow()
                diff = now - client['time']
                if diff < timedelta(minutes=30):
                    print client
                    clients_data[c['mac']] = {'mac':c['mac'], 'probes':c['probes']}

        resp = jsonify(clients_data)
        resp.status_code = 200

        return resp


@app.route('/deathray/client/<mac>', methods = ['GET'])
def client_observation(mac):
    if request.method == 'GET':
        db = init_db()
        client = get_client_last_observation(mac, db)
        client_data = {}
        time = client['time'].strftime('%H:%M:%S')
        client_data['client'] = {'mac':client['mac'], 'time':time, 'angle':client['angle'], 'power':client['power']}

        resp = jsonify(client_data)
        resp.status_code = 200

        return resp

@app.route('/deathray/clients/remove/all', methods = ['GET'])
def remove_clients():
    if request.method == 'GET':
        remove_all_clients()
        return "all clients removed from db, fresh start"

@app.route('/muck', methods = ['GET'])
def muck():
    device_data = create_device()
    resp = jsonify(device_data)
    resp.status_code = 200
    return resp

@app.route('/ath0/<device>', methods = ['GET'])
def disassociate(device):
    ## TODO make disassociation logic
    message = {}
    message[device] = 'ath0'
    try:
        local("sudo airodump-ng -c 6 --bssid %s -w out ath0 " % device)
    except:
        message[device] = 'ath0 failed'

    resp = jsonify(message)
    resp.status_code = 200

    return resp

@app.route('/console/<command>', methods = ['GET'])
def command(command):
    t = datetime.now().strftime('[%H:%M:%S]')
    print t
    if command == '--help':
        return '%s Commands: 1:[restart wlan] 2:[start mon] [stop mon] 3:[start dump] [stop dump]' %  str(t)
    elif command == 'getwlan':
        feedback = 'f'
        feedback = get_wlan()
        return '%s for now' % str(t)
    elif command == 'restart wlan':
        restart_wlan()
        return '%s wlan restarted' % str(t)
    elif command == 'start mon':
        start_monitor()
        return '%s start monitor mode' % str(t)
    elif command == 'db up':
        mess = start_mongodb()
        return '%s %s' % str(t), mess
    elif command == 'db down':
        mess = stop_mongodb()
        return '%s %s' % str(t), mess
    elif command == 'start scan':
        start_scan()
        return '%s start scanning' % str(t)
    elif command == 'stop mon':
        stop_monitor()
        return '%s stop monitor mode' % str(t)
    elif command == 'run data':
        run_dump()
        return '%s dumping data into database' % str(t)
    else:
        return '%s --help' % str(t)


# get current wlan interfaces running
def get_wlan():
    try:
        wlan = local("ifconfig | grep wlan", capture=True)
    except:
        return "fail to retrive wlan status"
    return "ok"

def start_monitor():
    local("sudo airmon-ng start wlan1")
    return "running air-mon"


def restart_wlan():
    try:
        local("sudo ifconfig wlan0 down")
        local("sudo ifconfig wlan0 up")
    except:
        return "wlan command fail"
    return "restaring deathray"


def start_mongodb():
    try:
        local("sudo /etc/init.d/mongodb start")
    except:
        return "db command fail"
    return "mongodb started"


def stop_mongodb():
    local("sudo /etc/init.d/mongodb stop")
    return "mongodb stopped"


def start_scan():
    local("sudo ifconfig wlan1 down")
    local("sudo ifconfig wlan1 up")
    local("sudo airmon-ng start wlan1")
    local("sudo airodump-ng --berlin 1 mon0 2>&1 | ./airodump-scrubber.pl | python datasamalen.py")
    return "scanning"

def start_monitor():
    local("sudo airmon-ng start wlan0")
    return "running air-mon"

def stop_monitor():
    local("sudo airmon-ng stop mon0")
    return "stopping air-mon"


def start_airmon():
    local("sudo airodump-ng mon0")
    return "mon down"

def run_dump():
    local("perl airodump-scrubber.pl")
    return "test ok"

def create_device():
    device = Clients(
        mac=generate_id(),
        power=str(generate_num(100)),
        angle=str(generate_num(360)),
        time= datetime.utcnow(),
        probs=['katten', 'huset']
    )
    device.save()
    device_data = {}
    time = device.time.strftime('%H:%M')
    device_data[device.mac] = {'power':device.power, 'time':time, 'angle':device.angle, 'mac': device.mac, 'probes':device.probs}

    return device_data
