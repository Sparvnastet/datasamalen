#!/bin/bash
./airodump-ng --berlin 1 mon1 2>&1 | ./airodump-scrubber.pl | python datasamalen.py
