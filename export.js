var tnpostcodes = require('./lib');

tnpostcodes.getAllCodes(function(err, codes)
{
    if (err)
        console.log(err);
    else
    {
        codes.forEach(function(code)
        {
            console.log(code.join(','));
        });
    }
});
