// On load
$(function () {
    "use strict";
    var $bayes = $("#bayes");
    var $rhs = $("#rhs");

    function draw() {
        var network = $bayes.val();
        $.post("/bayes/parse", network).done(function(response) {
            $rhs.empty();
            if (response.substring(0, 5) === "Error") {
                $rhs.append(response);
            } else {
                $rhs.append(Viz(response));
            }
        });
        saveNetwork(network);
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

    function loadNetwork() {
        var hash = deparam(location.hash.substr(1));
        if (hash["network"] !== undefined) {
            $bayes.val(window.atob(hash["network"]));
        }
    }

    function saveNetwork(network) {
        location.hash = param({"network": window.btoa(network)});
    }

    function main() {
        loadNetwork();

        $("#drawButton").click(draw);
        $(window).on("hashchange", function() {
            loadNetwork();
        });
        saveNetwork();

        draw();
    }

    main();
});
