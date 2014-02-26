var async = require('async');
var request = require('request');
var htmlparser = require('htmlparser2');
var querystring = require('querystring');

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

    var options = {
        url: ajaxUrl,
        body: new Buffer(querystring.stringify({
            ville: gouvernorat,
            delegation: delegation,
            localite: localite,
            do: 'resultat'
        })),
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    };

    var req = request.post(options);

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

function getAllCodes(dataCb, endCb)
{
    getGouvernorats(function(err, gouvernorats)
    {
        if (err)
        {
            endCb(err);
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
                                                rows.forEach(dataCb);

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
                endCb(err);
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

    var options = {
        url: ajax ? ajaxUrl : stdUrl,
        body: params ? new Buffer(querystring.stringify(params)) : undefined,
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        }
    };

    var req = params ? request.post(options) : request.get(options);

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
