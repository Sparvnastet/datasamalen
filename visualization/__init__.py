from flask import Flask
from flask.ext.mongoengine import MongoEngine


app = Flask(__name__)
app.config["MONGODB_SETTINGS"] = {'DB': "deathray"}
app.debug = True

db = MongoEngine(app)

if __name__ == '__main__':
    app.run()

def register_blueprints(app):
    # Prevents circular imports
    from visualization.views import devices
    app.register_blueprint(devices)

register_blueprints(app)

