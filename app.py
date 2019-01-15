#!/usr/bin/env python3

from collections import namedtuple
from importlib import import_module
from os import listdir
from os.path import dirname, isdir, realpath, join as join_path

from flask import abort, Flask, render_template, send_from_directory, url_for

IGNORE_DIRS = ['pages', 'assignments', 'static']

app = Flask(__name__)

modules = {}
for module_name in listdir(dirname(realpath(__file__))):
    if not isdir(module_name):
        continue
    if module_name[0] in '._':
        continue
    if module_name in IGNORE_DIRS:
        continue
    module = import_module(module_name)
    modules[module_name] = module
    app.register_blueprint(getattr(module, module_name))


@app.route('/')
def root():
    return send_from_directory('pages', 'index.html')


@app.route('/assignments/<filename>')
def get_assignment(filename):
    return send_from_directory('assignments', filename)


@app.route('/<applet>/static/<filename>')
def get_app_resource(applet, filename):
    if filename.split('.')[-1] in ('css', 'js'):
        return send_from_directory(join_path(applet, 'static'), filename)
    else:
        return abort(404)


if __name__ == '__main__':
    app.run(debug=True)
