import json
from os.path import basename, dirname, join as join_path

from flask import Blueprint, render_template, request, jsonify

from .info_ret import get_catalog, dispatch_transform

APP_NAME = basename(dirname(__file__))

app = Blueprint(
    APP_NAME,
    APP_NAME,
    url_prefix=('/' + APP_NAME),
    static_folder='static',
    static_url_path=join_path('/static', APP_NAME),
    template_folder='templates',
)


@app.route('/')
def root():
    return render_template(join_path(APP_NAME, 'index.html'))


@app.route('/process', methods=['POST'])
def process():
    json_data = json.loads(request.data.decode('utf-8'))
    transforms = json_data['transforms']
    departments = json_data['departments']
    catalog = get_catalog(departments)
    for transform in transforms:
        catalog = [dispatch_transform(transform, description) for description in catalog]
    result = list([old.text, new.text] for old, new in zip(get_catalog(departments), catalog))
    return jsonify({'data': result})
