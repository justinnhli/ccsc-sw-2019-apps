var RULES = [];

var Condition = class Condition {
    constructor(cond) {
        var m = 0;
        var var_map = [];
        var matches = [];
        var match = "";

        matches = cond.match(new RegExp(/\b([A-Z])\1{2,}\b/, "g"));
        if (matches) {
            for (m = 0; m < matches.length; m += 1) {
                match = matches[m];
                if (var_map.indexOf(match) === -1) {
                    var_map.push(match);
                }
            }
            for (m = 0; m < var_map.length; m += 1) {
                cond = cond.replace(new RegExp("\\b" + var_map[m] + "\\b"), "(.*)");
                cond = cond.replace(new RegExp("\\b" + var_map[m] + "\\b", "g"), "\\" + (m+1).toString());
            }
        }
        if (cond === "") {
            this.condition = new RegExp();
        } else {
            this.condition = new RegExp("^" + cond + "$", "i");
        }
        this.var_map = var_map;
    }
    match(input) {
        return input.match(this.condition);
    }
}

var Rule = class Rule {
    constructor(conditions, actions) {
        var c = 0;
        this.conditions = [];
        for (c = 0; c < conditions.length; c += 1) {
            this.conditions.push(new Condition(conditions[c]));
        }
        this.actions = actions;
    }
    match(input) {
        var c = 0, m = 0, a = 0;
        var cond = null;
        var matches = [];
        var act = "";
        for (c = 0; c < this.conditions.length; c += 1) {
            cond = this.conditions[c];
            matches = cond.match(input);
            if (matches) {
                a = Math.floor(Math.random() * this.actions.length);
                act = this.actions[a];
                if (matches.length > 1) {
                    for (m = 0; m < matches.length - 1; m += 1) {
                        act = act.replace(new RegExp("\\b" + cond.var_map[m] + "\\b", "g"), matches[m+1]);
                    }
                }
                return act;
            }
        }
        return null;
    }
};

function init() {
    "use strict";
    var editor_tag = $("#editor");
    editor_tag.val(editor_tag.val().trim() + "\n");
    var transcript_tag = $("#transcript");
    $("#reply-text").on("keypress", function (e) {
        if (e.which === 13) {
            e.preventDefault();
            interact();
        }
    });
    load_agent();
    transcript_tag.val("");
    add_to_transcript("Chatbot", "Glad you could come to this counseling session. What is on your mind today?\n");
    $("#reply-text").focus();
}

function load_agent() {
    "use strict";
    RULES = [];
    var lines = $("#editor").val().split("\n");
    var parsing_actions = false;
    var conditions = [];
    var actions = [];
    var line = "";
    var l = 0;
    for (l = 0; l < lines.length; l += 1) {
        line = lines[l].trim();
        if (line.length === 0 || line.charAt(0) === "#") {
            continue;
        }
        if (line.charAt(0) === "@") {
            if (parsing_actions) {
                RULES.push(new Rule(conditions, actions));
                conditions = [];
                actions = [];
                parsing_actions = false;

            }
            conditions.push(line.substring(1));
        } else if (line.charAt(0) === "%") {
            parsing_actions = true;
            actions.push(line.substring(1));
        }
    }
    if (conditions.length > 0 && actions.length > 0) {
        RULES.push(new Rule(conditions, actions));
    }
}

function interact() {
    "use strict";
    var rule = null;
    var act = null;
    var r = 0;
    var reply_tag = $("#reply-text");
    var input = strip_punctuation(reply_tag.val());
    var transcript_tag = $("#transcript");
    if (input === "") {
        return;
    }
    add_to_transcript("You", input);
    for (r = 0; r < RULES.length; r += 1) {
        act = RULES[r].match(input);
        if (act !== null) {
            add_to_transcript("Chatbot", act);
            break;
        }
    }
    transcript_tag.val(transcript_tag.val() + "\n");
    reply_tag.val("");
}

function add_to_transcript(speaker, content) {
    "use strict";
    var transcript_tag = $("#transcript");
    transcript_tag.val(transcript_tag.val() + speaker + ": " + content + "\n");
}

function strip_punctuation(input) {
    "use strict";
    input = input.trim();
    input = input.replace(new RegExp("^[^0-9A-Za-z]"), "");
    return input.replace(new RegExp("[^0-9A-Za-z]$"), "");
}
