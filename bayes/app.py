from os.path import basename, dirname, join as join_path

from flask import Blueprint, render_template, request

from .bayesnet import BayesNet

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


@app.route('/parse', methods=['POST'])
def parse():
    bayes_text = request.get_data(as_text=True)
    net = BayesNet(bayes_text)
    if net.has_errors:
        return net.error
    else:
        return net.dot()
