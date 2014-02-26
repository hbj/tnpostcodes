var async = require('async');
var request = require('request');
var htmlparser = require('htmlparser2');

var stdUrl = 'http://www.poste.tn/codes.php';
var ajaxUrl = 'http://www.poste.tn/codes_ajax.php';

module.exports = {
    getGouvernorats: getGouvernorats,
    getDelegations: getDelegations,
    getLocalites: getLocalites,
    getCodes: getCodes,
    getAllCodes: getAllCodes
};

function getGouvernorats(cb)
{
    getSelect('ville', false, null, cb);
}

function getDelegations(gouvernorat, cb)
{
    var params = {
        ville: gouvernorat,
        do: 'delegation'
    };

    getSelect('delegation', true, params, cb);
}

function getLocalites(gouvernorat, delegation, cb)
{
    var params = {
        ville: gouvernorat,
        delegation: delegation,
        do: 'localite'
    };

    getSelect('localite', true, params, cb);
}

function getCodes(gouvernorat, delegation, localite, cb)
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
        ville: gouvernorat,
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

    getGouvernorats(function(err, gouvernorats)
    {
        if (err)
        {
            cb(err, null);
            return;
        }

        async.eachSeries(
            gouvernorats,
            function(gouvernorat, cbGouvernorat)
            {
                getDelegations(gouvernorat, function(err, delegations)
                {
                    if (err)
                    {
                        cbGouvernorat(err);
                        return;
                    }

                    async.eachSeries(
                        delegations,
                        function(delegation, cbDelegation)
                        {
                            getLocalites(gouvernorat, delegation, function(err, localites)
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
                                        getCodes(gouvernorat, delegation, localite, function(err, rows)
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
                        cbGouvernorat
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
