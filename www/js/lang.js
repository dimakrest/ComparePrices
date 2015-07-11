/**
 * Created by dimakrest on 7/9/15.
 */
(function()
{
    document.localize = {}

    var heb = {
        'Amount':'כמות:',
        'AddedProduct': 'מוצר נוסף',
        'FindNearestShop':'מצא חנות קרובה'
    }

    document.selectLanguage = function(lang)
    {
        localStorage.setItem('lang',lang)
        switch(lang)
        {
            default:
                document.localize.strings = heb
                break;
        }
    }
    document.getLanguage = function()
    {
        return localStorage.getItem('lang')
    }
})()
document.selectLanguage(localStorage.getItem('lang') || 'heb')