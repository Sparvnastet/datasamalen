"""
Copyright (c) 2013 Anders Sundman <anders@4zm.org>

This file is part of Datasamalen

Datasamalen is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

Datasamalen is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with Datasamalen.  If not, see <http://www.gnu.org/licenses/>.
"""

import sys
import select

import pymongo
from datetime import datetime, timedelta
from pymongo import MongoClient
import re
import numpy
import serial


# Open the serial port (angle data from arduino) if available
def init_serial(tty = '/dev/ttyUSB0'):
    """ Initialize the serial comunication object """

    try:
        s = serial.Serial(tty, 9600, timeout=1)
        return s
    except:
        s = None
        sys.stderr.write('WARNING: No serial interface found - running without angle info\n')

    return s

def init_db(host = '127.0.0.1', port = 27017):
    mongo_client = MongoClient(host, port)
    return mongo_client.deathray
    
# Client observation
#   mac
#-   connected
#   power
#   probes
#   angle
#   time

# AP observation

# Client
#   mac
#   probes
#   

# AP
# 

def parse_airodump(line):
    """ Process one line from the airodump scrubber """
    parts = line.split()
    if (parts[0] == 'A'):
        return parse_ap(line)
    elif (parts[0] == 'C'):
        sys.stdout.write(line) # write line to stdout
        return parse_client(line)
    

def parse_client(line):
    """ """
    parts = line.split()
    date, time = parts[1:3]
    ap, mac = parts[3:5]
    pwr = parts[5]
    probes = line[90:]

    #print(mac)
    #print(''.join(['  AP  ', ap]))
    #print(''.join(['  PWR ', pwr]))
    #print(''.join(['  PRB ', probes]))

    pwr = int(pwr)
    
    client = dict()
    client['type'] = 'client'
    client['mac'] = mac
    client['power'] = pwr if pwr < -1 and pwr > -127 else None 
    client['probes'] = [s.strip() for s in probes.split(',') if s != '']
    return client
    
def parse_ap(line):
    """ """
    ap = dict()
    ap['type'] = 'ap'
    return ap
    
# def add_angle_info(sport, sample):
#     """ If available, add angular data to data point """

#     angle_reading = sport.readline() if sport else None
    
#     sample['angle'] = into(angle_reading[:-2]) if angle_reading and re.match('^-?[0-9]+\r\n', angle_reading) else None

def update_db(db, sample):
    """ Add the sample to the db, or update the data allready there """  

    if sample['type'] != 'client':
        return

    if sample.get('angle', None) == None:
        sys.stderr.write("Warning: Inserting null angle\n")

    # Register the observation (if it includes power info)
    if sample['power']:
        client_observations = db.client_observations
        client_observations.insert({
                'mac': sample['mac'],
                'time': datetime.utcnow(),
                'power': sample['power'],
                'angle': sample.get('angle', None),
                })


    # Get the clients collection
    clients = db.clients

    # Get the client if it is already known
    client = clients.find_one({"mac": sample['mac']})     

    # If it's a new client, insert it
    if not client:
        clients.insert({
                'mac': sample['mac'],
                'probes': sample['probes'],
                })
        
    # If it's a known client, update it
    else:
        client['probes'] = list(set(client['probes']) | set(sample['probes']))
        clients.save(client)

def get_clients_db():
    """ Get the clients : TODO I guess the is a better way den creating db here """
    db = init_db()
    # Get the clients collection
    clients = db.clients
    return clients

def get_client_last_observation(mac, db):
    client = db.client_observations.find({"mac": mac}).sort([("timestamp", pymongo.DESCENDING)])
    return client or client[0]

def run_capture(db, sport, infile = None):
    if not infile:
        infile = sys.stdin

    # find out what files to listen to
    if infile and sport:
        sys.stdout.write("selecting on both airodump and serial port\n")
        fdlist = [infile, sport]
    elif infile and not sport:
        sys.stdout.write("selecting only on airodump input\n")
        fdlist = [infile]
    elif not infile:
        sys.stderr.write("ERROR: I have no infile. I don't know how to deal with this. Terminating.\n")
        sys.exit(4)
            
    
    angle = None
    while True:
        (fds_ready, _1, _2) = select.select(fdlist, [], [])
        if sport and sport in fds_ready:
            angle_reading = sport.readline() if sport else None
            angle = int(angle_reading[:-2]) if angle_reading and re.match('^-?[0-9]+\r\n', angle_reading) else None
        if infile in fds_ready:
            if angle == None and sport:
                sys.stdout.write("I DO have a serial port but I have yet to receive angles from Arduino.\n")
                continue        # don't do anything if we have yet to receive angle data, unless we have no serial port in which case we simple do without
            line = infile.readline().decode('latin1')

            if not line:
                break           # on EOF from airodump
            sample = parse_airodump(line)
            sample['angle'] = angle
            update_db(db, sample)


def get_last_observation(db, mac, time_sec):
    """
    Process all observations of client with the specified mac during the
    last time_sec seconds to find the max power and the angle.
    """

    # First, querry db for the latest observations
    obs = db.client_observations
    delta = timedelta(0, time_sec, 0)
    now = datetime.utcnow()
    last_obs = list(obs.find({'mac': mac,
                              'time': {'$gt': now - delta}}))
    if len(last_obs) < 1:
        return None, None

    powers = [o['power'] for o in last_obs]
    angles = [o['angle'] for o in last_obs]

    #print("raw pow: " + str(powers))
    #print("raw ang: " + str(angles))

    # Filter the power vector to reduce noise
    powers = [int(x) for x in pwr_filter(powers)]

    #print("flt pow: " + str(powers))

    peak_power = max(powers)

    # All observations must contain angle data, or none
    if None in angles:
        return peak_power, None

    # Find the angle with the most power
    peak_angle = center_of_gravity(powers, angles)

    return peak_power, peak_angle



def remove_all_observations(db):
    db.client_observations.remove({})

def remove_all_clients():
    db = init_db()
    db.clients.remove()

def pwr_filter(l):

    if not l or len(l) < 1:
        return None

    kernel = [2, 6, 2]

    # Normalize kernel
    ks = sum(kernel)
    kernel = [float(v) / ks for v in kernel]

    # Pad data by extrapolating last value
    hkl = len(kernel) // 2
    ext_list = l[:hkl] + l + l[-hkl:]

    # Do the convolution
    return list(numpy.convolve(ext_list, kernel, 'valid'))

def center_of_gravity(w, a = None):
    """
    Comute weighted center of gravity
    w : weights, i.e. the power

    a : angle data associated with the power data points
    """

    if not w or len(w) < 1:
        return None

    # If no angle is specified, use w indexes as angles
    if not a:
        a = list(xrange(len(w)))
    elif len(w) != len(a):
        print("ERROR: weight and angle lists must be of equal length")
        return None

    # Improve numerical stability by translating the data to the center
    mid = sum(a) / len(a)

    # Compute center of gravity
    cog = sum([(a[i] - mid) * float(x) for i, x in enumerate(w)]) / sum(w) + mid

    return cog

if __name__ == '__main__':
    sport = init_serial()
    db = init_db()
    run_capture(db, sport, sys.stdin)


