#!/bin/bash
ifconfig wlan0 down
ifconfig wlan0 up
airmon-ng start wlan0

