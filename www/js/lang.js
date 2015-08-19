/**
 * Created by dimakrest on 7/9/15.
 */
(function()
{
    document.localize = {};

    var heb = {
        'Amount':'כמות:',
        'AddedProduct': 'מוצר נוסף',
        'AddressPlaceHolder': 'הכנס כתובת',
        'FindLocationButton': 'חפש',
        'SearchQueryEditProductPlaceholder': 'הקלד שם מוצר',
        'SearchQueryCartDetailsPlaceholder': 'הקלד שם מוצר',
        'EditCartHeader': 'עידכון',
        'MyCartsTitle': 'סלים שלי',
        'EditButton': 'עדכן',
        'CancelButton': 'בטל',
        'SaveButton': 'שמור',
        'EnterCartName': 'הכנס שם של סל',
        'Cart': 'סל',
        'AreYouSureWantToDeleteProductTitle': 'למחוק מוצר',
        'AreYouSureWantToDeleteProductText': '?אתה בטוח שאתה רוצה למחוק את המוצר',
        'AreYouSureWantToDeleteCartTitle': 'למחוק סל',
        'AreYouSureWantToDeleteCartText': '?אתה בטוח שאתה רוצה למחוק את הסל',
        'YesButton': 'כן',
        'NoButton': 'לא',
        'ShareHeader': 'שתף',
        'FindBestShop': 'מצא מחיר הטוב ביותר',
        'TotalCartsSelected': 'סלים נבחרו',
        'ChooseYourAddressInSettings': 'קודם תבחר מיקומך בהגדרות',
        'MyAddress': 'כתובת שלי'
    };

    document.selectLanguage = function(lang)
    {
        localStorage.setItem('lang',lang);
        switch(lang)
        {
            default:
                document.localize.strings = heb;
                break;
        }
    };
    document.getLanguage = function()
    {
        return localStorage.getItem('lang')
    }
})();
document.selectLanguage(localStorage.getItem('lang') || 'heb');