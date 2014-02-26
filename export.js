var tnpostcodes = require('./lib');

tnpostcodes.getAllCodes(
    function(data)
    {
        console.log(data.join(','));
    },
    function(err)
    {
        if (err)
            console.log(err);
    }
);
