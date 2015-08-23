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
        'SearchQueryCartDetailsPlaceholder': 'הקלד שם מוצר',
        'MyCartsTitle': 'סלים שלי',
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
        'FindBestShop': 'לבדוק מחירים',
        'TotalCartsSelected': 'סלים נבחרו',
        'ChooseYourAddressInSettings': 'קודם תבחר מיקומך בהגדרות',
        'ChooseCartsFirst': 'קודם תבחר סלים',
        'MyAddress': 'כתובת שלי',
        'StoreName': 'שם רשת: ',
        'PriceInStore': 'מחיר: ',
        'DistanceToStore': 'מרחק לחנות:',
        'StoreAddress': 'כתובת החנות: ',
        'UpdatingListOfStores': '... מעדכן את רשימת החנויות',
        'LookingForBestShop': 'מחפש את החנות הזולה',
        'ToggleMyLocation': 'השתמש במיקום הנוכחי',
        'DistanceToShop': 'מרחק',
        'CannotGetCurrentLocation': 'לא הצחנו לקבל את מיקומל, אנא נסה שנית'
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