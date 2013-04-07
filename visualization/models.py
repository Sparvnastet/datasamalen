from visualization import db
import datetime

class Device(db.Document):
    mac = db.StringField(max_length=17, required=True)
    time = db.DateTimeField(default=datetime.datetime.now, required=True)
    power = db.StringField(max_length=3)
    packets = db.StringField(max_length=5)
    bssid = db.StringField(max_length=17)
    angel = db.StringField(max_length=3)

    def __unicode__(self):
        return self.mac