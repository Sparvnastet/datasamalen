#!/bin/sh

rm data -r
mkdir data
mongod --rest --dbpath data
python manage.py runserver &
python sart.sh
