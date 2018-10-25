#!/usr/bin/env python3

from collections import namedtuple
from importlib import import_module
from os import listdir
from os.path import dirname, isdir, realpath, join as join_path

from flask import abort, Flask, render_template, send_from_directory, url_for

IGNORE_DIRS = ['blueprint_template', 'static', 'templates']

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


@app.route('/static/<filename>')
def resources(filename):
    if filename.split('.')[-1] in ('css', 'js'):
        return send_from_directory('static', filename)
    else:
        return abort(404)


@app.route('/<applet>/static/<filename>')
def get_app_resource(applet, filename):
    if filename.split('.')[-1] in ('css', 'js'):
        return send_from_directory(join_path(applet, 'static'), filename)
    else:
        return abort(404)


@app.route('/')
def root():
    Applet = namedtuple('Applet', ('name', 'url', 'doc'))
    applets = {}
    for rule in app.url_map.iter_rules():
        if not rule.endpoint.endswith('.root'):
            continue
        name = rule.endpoint.replace('.root', '').split('.')[0]
        url = url_for(rule.endpoint)
        doc = modules[name].__doc__
        doc = doc.strip().splitlines()[0]
        applets[name] = Applet(name, url, doc)
    return render_template('index.html', applets=sorted(applets.items()))


if __name__ == '__main__':
    app.run(debug=True)
