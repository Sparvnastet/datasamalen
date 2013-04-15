#!/bin/bash
ifconfig wlan2 down
ifconfig wlan2 up
airmon-ng start wlan2

