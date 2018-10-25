$(function () {

    /* TOP-LEVEL FUNCTIONS */

    function main() {
        attach_handlers();
        if (!load_transforms()) {
            add_transform("select");
            save_transforms();
        }
    }

    function attach_handlers() {
        $("#add-transform").on("click", function() {
            add_transform("select");
            save_transforms();
        });
        $("#run").on("click", run);
        $("#reset").on("click", reset);
    }

    function reset() {
        $("#transforms").empty();
        add_transform("select");
        save_transforms();
    }

    function run() {
        save_transforms();
        var transforms = jsonify_transforms();
        var departments = jsonify_departments();
        var data = {transforms:transforms, departments:departments};
        $.ajaxSetup({
            contentType: "application/json; charset=utf-8"
        });
        $.post("/info_ret/process", JSON.stringify(data), function (response) {
            response = response["data"];
            var results_div = $("#results");
            results_div.empty();
            results_div.append($("<h2>Results</h2>"));
            var results_table = $("<table></table>");
            for (var i = 0; i < response.length; i++) {
                var original = response[i][0];
                var transformed = response[i][1];
                var html = "";
                html += "<tr>";
                html += "    <td><ul>";
                for (var j = 0; j < original.length; j++) {
                    html += "<li>" + original[j] + "</li>";
                }
                html += "    </ul></td>";
                html += "    <td><ul>";
                for (var j = 0; j < transformed.length; j++) {
                    html += "<li>" + transformed[j] + "</li>";
                }
                html += "    </ul></td>";
                html += "</tr>";
                results_table.append($(html));
            }
            results_div.append(results_table);
        }, "json");
    }

    function param(obj) {
        return $.param(obj, false);
    }

    function deparam(str) {
        var obj = {};
        str.replace(/([^=&]+)=([^&]*)/g, function(m, key, value) {
            obj[decodeURIComponent(key)] = decodeURIComponent(value);
        });
        return obj;
    }

    function load_transforms() {
        var hash = deparam(location.hash.substr(1));
        if ("transforms" in hash) {
            var json = JSON.parse(window.atob(hash["transforms"]));
            dejsonify_transforms(json);
            return true;
        }
        return false;
    }

    function save_transforms() {
        var json = jsonify_transforms();
        location.hash = param({"transforms": window.btoa(JSON.stringify(json))});
    }

    /* DEPARTMENT FUNCTIONS */

    function jsonify_departments() {
        var departments = [];
        $("#departments input").each(function () {
            var checkbox = $(this);
            if (checkbox.prop("checked")) {
                departments.push(checkbox.val());
            }
        });
        return departments;
    }

    /* SERIALIZATION FUNCTIONS */

    function jsonify_transforms() {
        var json = [];
        $("#transforms").find(".transform").each(function () {
            var operation = $(this).children().first();
            if (operation.val() === "select") {
                json.push(jsonify_select_operation($(this)));
            } else if (operation.val() === "split") {
                json.push(jsonify_split_operation($(this)));
            } else if (operation.val() === "insert") {
                json.push(jsonify_insert_operation($(this)));
            } else if (operation.val() === "delete") {
                json.push(jsonify_delete_operation($(this)));
            } else if (operation.val() === "replace") {
                json.push(jsonify_replace_operation($(this)));
            }
        });
        return json;
    }

    function jsonify_select_operation(transform) {
        var json = ["select"];
        Array.prototype.push.apply(json, jsonify_filter_specifier($(transform.children(".filter-specifier")[0])));
        return json;
    }

    function jsonify_split_operation(transform) {
        var json = ["split"];
        Array.prototype.push.apply(json, jsonify_location_specifier($(transform.children(".location-specifier")[0])));
        return json;
    }

    function jsonify_insert_operation(transform) {
        var json = ["insert"];
        Array.prototype.push.apply(json, jsonify_location_specifier($(transform.children(".location-specifier")[0])));
        Array.prototype.push.apply(json, jsonify_text_specifier($(transform.children(".insert-text-specifier")[0])));
        return json;
    }

    function jsonify_delete_operation(transform) {
        var json = ["delete"];
        Array.prototype.push.apply(json, jsonify_range_specifier($(transform.children(".range-specifier")[0])));
        return json;
    }

    function jsonify_replace_operation(transform) {
        var json = ["replace"];
        Array.prototype.push.apply(json, jsonify_text_specifier($(transform.children(".text-specifier")[0])));
        Array.prototype.push.apply(json, jsonify_text_specifier($(transform.children(".insert-text-specifier")[0])));
        return json;
    }

    function jsonify_filter_specifier(filter_specifier) {
        var json = [];
        json.push($(filter_specifier.children(".negation-specifier")[0]).val());
        json.push($(filter_specifier.children(".containment-specifier")[0]).val());
        Array.prototype.push.apply(json, jsonify_text_specifier($(filter_specifier.children(".text-specifier")[0])));
        return json;
    }

    function jsonify_range_specifier(range_specifier) {
        var json = [];
        json.push($(range_specifier.children(".fromuntil-specifier")[0]).val());
        Array.prototype.push.apply(json, jsonify_location_specifier($(range_specifier.children(".location-specifier")[0])));
        return json;
    }

    function jsonify_location_specifier(location_specifier) {
        var json = [];
        json.push($(location_specifier.children(".prepost-specifier")[0]).val());
        Array.prototype.push.apply(json, jsonify_text_specifier($(location_specifier.children(".text-specifier")[0])));
        return json;
    }

    function jsonify_text_specifier(text_specifier) {
        var select = $(text_specifier.children("select")[0]);
        if (select.val() === "other") {
            return [JSON.stringify($(text_specifier.children(".custom-text-specifier")[0]).val())];
        } else {
            return [select.val()];
        }
    }

    /* DESERIALIZATION FUNCTIONS */

    function dejsonify_transforms(json) {
        for (var i = 0; i < json.length; i++) {
            var line = json[i];
            if (line[0] === "select") {
                dejsonify_select_operation(line);
            } else if (line[0] === "split") {
                dejsonify_split_operation(line);
            } else if (line[0] === "insert") {
                dejsonify_insert_operation(line);
            } else if (line[0] === "delete") {
                dejsonify_delete_operation(line);
            } else if (line[0] === "replace") {
                dejsonify_replace_operation(line);
            }
        }
    }

    function dejsonify_select_operation(tokens) {
        var list_item = add_transform("select");
        dejsonify_filter_specifier(tokens.slice(1), $(list_item.find(".filter-specifier")[0]));
    }

    function dejsonify_split_operation(tokens) {
        var list_item = add_transform("split");
        dejsonify_location_specifier(tokens.slice(1), $(list_item.find(".location-specifier")[0]));
    }

    function dejsonify_insert_operation(tokens) {
        var list_item = add_transform("insert");
        dejsonify_location_specifier(tokens.slice(1, 3), $(list_item.find(".location-specifier")[0]));
        dejsonify_text_specifier(tokens[3], $(list_item.find(".insert-text-specifier")[0]));
    }

    function dejsonify_delete_operation(tokens) {
        var list_item = add_transform("delete");
        dejsonify_range_specifier(tokens.slice(1), $(list_item.find(".range-specifier")[0]));
    }

    function dejsonify_replace_operation(tokens) {
        var list_item = add_transform("replace");
        dejsonify_text_specifier(tokens[1], $(list_item.find(".text-specifier")[0]));
        dejsonify_text_specifier(tokens[2], $(list_item.find(".insert-text-specifier")[0]));
    }

    function dejsonify_filter_specifier(tokens, filter_specifier) {
        filter_specifier.find(".negation-specifier").val(tokens[0]);
        filter_specifier.find(".containment-specifier").val(tokens[1]);
        dejsonify_text_specifier(tokens[2], $(filter_specifier.find(".text-specifier")[0]));
    }

    function dejsonify_range_specifier(tokens, range_specifier) {
        range_specifier.find(".fromuntil-specifier").val(tokens[0]);
        dejsonify_location_specifier(tokens.slice(1), $(range_specifier.find(".location-specifier")[0]));
    }

    function dejsonify_location_specifier(tokens, location_specifier) {
        location_specifier.find(".prepost-specifier").val(tokens[0]);
        dejsonify_text_specifier(tokens[1], $(location_specifier.find(".text-specifier")[0]));
    }

    function dejsonify_text_specifier(json, text_specifier) {
        var select = $(text_specifier.children("select")[0]);
        if (json.startsWith("\"")) {
            select.val("other").trigger("change");
            $(text_specifier.children(".custom-text-specifier")[0]).val(JSON.parse(json));
        } else {
            select.val(json).trigger("change");
        }
    }

    /* EVENT HANDLER FUNCTIONS */

    function change_operation_handler(e) {
        var select = $(e.target);
        var transform = $(select).parent();
        transform.children().first().nextAll().remove();
        if (select.val() === "select") {
            transform.append($("<span> lines that </span>"));
            transform.append(create_filter_specifier());
        } else if (select.val() === "split") {
            transform.append($("<span> lines apart </span>"));
            transform.append(create_location_specifier());
        } else if (select.val() === "insert") {
            transform.append(create_location_specifier());
            transform.append(create_insert_text_specifier());
        } else if (select.val() === "delete") {
            transform.append(create_range_specifier());
        } else if (select.val() === "replace") {
            transform.append(create_text_specifier());
            transform.append($("<span> with </span>"));
            transform.append(create_insert_text_specifier());
        }
        save_transforms();
    }

    function change_text_handler(e) {
        var select = $(e.target);
        if (select.val() === "other") {
            select.next().show();
        } else {
            select.next().hide();
        }
        save_transforms();
    }

    /* GUI FUNCTIONS */

    function add_transform(operation) {
        var list_item = $("<li></li>");
        var operation_specifier = create_operation_specifier();
        list_item.append($("<div class=\"transform\"></div>").append(operation_specifier))
                 .append($("<span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>"))
                 .append($("<span class=\"remove-transform\">X</span>").on("click", remove_transform_handler));
        operation_specifier.val(operation).trigger("change");
        $("#transforms").append(list_item);
        return list_item;
    }

    function remove_transform_handler(e) {
        $(e.target).parent("li").remove();
        save_transforms();
    }

    /* TRANSFORM COMPONENT FUNCTIONS */

    function create_operation_specifier() {
        var html = "";
        html += "<select class=\"operation-specifier\">";
        html += "    <option value=\"select\">select</option>";
        html += "    <option value=\"split\">split</option>";
        html += "    <option value=\"insert\">insert</option>";
        html += "    <option value=\"delete\">delete</option>";
        html += "    <option value=\"replace\">replace</option>";
        html += "</select>";
        return $(html).on("change", change_operation_handler);
    }

    function create_filter_specifier() {
        var negation_specifier = "";
        var containment_specifier = "";
        negation_specifier += "<select class=\"negation-specifier\">";
        negation_specifier += "   <option>do</option>";
        negation_specifier += "   <option>do not</option>";
        negation_specifier += "</select>";
        containment_specifier += "<select class=\"containment-specifier\">";
        containment_specifier += "   <option>contain</option>";
        containment_specifier += "   <option>start with</option>";
        containment_specifier += "   <option>end with</option>";
        containment_specifier += "</select>";
        return $("<div class=\"filter-specifier\"></div>")
            .append($(negation_specifier).on("change", save_transforms))
            .append($(containment_specifier).on("change", save_transforms))
            .append(create_text_specifier());
    }

    function create_range_specifier() {
        var fromuntil_specifier = "";
        fromuntil_specifier += "<select class=\"fromuntil-specifier\">";
        fromuntil_specifier += "    <option value=\"start\">from the start until</option>";
        fromuntil_specifier += "    <option value=\"end\">to the end from</option>";
        fromuntil_specifier += "</select>";
        return $("<div class=\"range-specifier\"></div>")
            .append($(fromuntil_specifier).on("change", save_transforms))
            .append(create_location_specifier());
    }

    function create_location_specifier() {
        var prepost_specifier = "";
        prepost_specifier += "<select class=\"prepost-specifier\">";
        prepost_specifier += "    <option>before</option>";
        prepost_specifier += "    <option>after</option>";
        prepost_specifier += "</select>";
        return $("<div class=\"location-specifier\"></div>")
            .append($(prepost_specifier).on("change", save_transforms))
            .append(create_text_specifier());
    }

    function create_text_specifier() {
        var select = "";
        select += "<select>";
        select += "    <option value=\"any-digit\">Groups of Digits</option>";
        select += "    <option value=\"lower-case\">Groups of Lower-case Letter</option>";
        select += "    <option value=\"upper-case\">Groups of Upper-case Letter</option>";
        select += "    <option value=\"three-digits\">Three Digits</option>";
        select += "    <option value=\"dept-name\">Course Department Name</option>";
        select += "    <option value=\"dept-code\">Course Department Code</option>";
        select += "    <option value=\"other\">(Other)</option>";
        select += "</select>";
        return $("<div class=\"text-specifier\"></div>")
            .append($(select).on("change", change_text_handler))
            .append(
                $("<input class=\"custom-text-specifier\" value=\"\" type=\"text\">").on("keyup", save_transforms)
            );
    }

    function create_insert_text_specifier() {
        var select = "";
        select += "<select>";
        select += "    <option value=\"dept-name\">Course Department Name</option>";
        select += "    <option value=\"dept-code\">Course Department Code</option>";
        select += "    <option value=\"other\">(Other)</option>";
        select += "</select>";
        return $("<div class=\"insert-text-specifier\"></div>")
            .append($(select).on("change", change_text_handler))
            .append(
                $("<input class=\"custom-text-specifier\" value=\"\" type=\"text\">").on("keyup", save_transforms)
            );
    }

    main();
});
