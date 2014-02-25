var async = require('async');
var request = require('request');
var htmlparser = require('htmlparser2');

var stdUrl = 'http://www.poste.tn/codes.php';
var ajaxUrl = 'http://www.poste.tn/codes_ajax.php';

module.exports = {
    getVilles: getVilles,
    getDelegations: getDelegations,
    getLocalites: getLocalites,
    getCodes: getCodes,
    getAllCodes: getAllCodes
};

function getVilles(cb)
{
    getSelect('ville', false, null, cb);
}

function getDelegations(ville, cb)
{
    var params = {
        ville: ville,
        do: 'delegation'
    };

    getSelect('delegation', true, params, cb);
}

function getLocalites(ville, delegation, cb)
{
    var params = {
        ville: ville,
        delegation: delegation,
        do: 'localite'
    };

    getSelect('localite', true, params, cb);
}

function getCodes(ville, delegation, localite, cb)
{
    var inCell = false;
    var value = '';
    var row = [];
    var rows = [];

    var parser = new htmlparser.Parser({
        onopentag: function(name)
        {
            if (name === 'td')
                inCell = true;
        },
        ontext: function(text)
        {
            if (inCell)
                value += text;
        },
        onclosetag: function(tagname)
        {
            if (inCell && tagname === 'td')
            {
                row.push(value);
                value = '';
                inCell = false;
            }
            else if (tagname === 'tr')
            {
                if (row.length === 4 && row[3].match(/^\s*[0-9]+\s*$/))
                    rows.push(row);

                row = [];
            }
        }
    });

    var params = {
        ville: ville,
        delegation: delegation,
        localite: localite,
        do: 'resultat'
    };

    var req = request.post(ajaxUrl).form(params);

    req.on('data', function(chunk)
    {
        parser.write(chunk);
    });

    req.on('end', function()
    {
        parser.end();
        cb(null, rows);
    });

    req.on('error', function(err)
    {
        cb(err, null);
    });
}

function getAllCodes(cb)
{
    var codes = [];

    getVilles(function(err, villes)
    {
        if (err)
        {
            cb(err, null);
            return;
        }

        async.eachSeries(
            villes,
            function(ville, cbVille)
            {
                getDelegations(ville, function(err, delegations)
                {
                    if (err)
                    {
                        cbVille(err);
                        return;
                    }

                    async.eachSeries(
                        delegations,
                        function(delegation, cbDelegation)
                        {
                            getLocalites(ville, delegation, function(err, localites)
                            {
                                if (err)
                                {
                                    cbDelegation(err);
                                    return;
                                }

                                async.eachSeries(
                                    localites,
                                    function(localite, cbLocalite)
                                    {
                                        getCodes(ville, delegation, localite, function(err, rows)
                                        {
                                            if (!err)
                                                codes = codes.concat(rows);

                                            cbLocalite(err);
                                        });
                                    },
                                    cbDelegation
                                );
                            });
                        },
                        cbVille
                    );
                });
            },
            function(err)
            {
                cb(err, codes);
            }
        );
    });
}

// Utilities

function getSelect(type, ajax, params, cb)
{
    var inSelect = false;
    var inOption = false;
    var value = '';
    var keys = [];
    var values = [];

    var parser = new htmlparser.Parser({
        onopentag: function(name, attribs)
        {
            if (name === 'select' && attribs.name === type)
                inSelect = true;
            else if (inSelect && name === 'option')
            {
                keys.push(attribs.value);
                inOption = true;
            }
        },
        ontext: function(text)
        {
            if (inOption)
                value += text;
        },
        onclosetag: function(tagname)
        {
            if (inSelect && tagname === 'select')
                inSelect = false;
            else if (inOption && tagname === 'option')
            {
                values.push(value);
                value = '';
                inOption = false;
            }
        }
    });

    var req = ajax ? request.post(ajaxUrl).form(params) : request.get(stdUrl);
    req.on('data', function(chunk)
    {
        parser.write(chunk);
    });

    req.on('end', function()
    {
        parser.end();

        if (keys.length != values.length)
        {
            var msg = 'Résultat incohérent:\n';
            msg += 'params = ' + JSON.stringify(params) + '\n';
            msg += 'keys = ' + JSON.stringify(keys) + '\n';
            msg += 'values = ' + JSON.stringify(values);

            cb(new Error(msg), null, null);
        }
        else
        {
            keys.shift();
            values.shift();
            cb(null, keys, values);
        }
    });

    req.on('error', function(err)
    {
        cb(err, null, null);
    });
}
