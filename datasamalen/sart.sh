#!/bin/bash
airodump-ng --berlin 1 mon0 2>&1 | ./airodump-scrubber.pl | python datasamalen.py
