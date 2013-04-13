#!/bin/bash
ifconfig wlan1 down
ifconfig wlan1 up
airmon-ng start wlan1

