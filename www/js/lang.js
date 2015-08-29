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
        'CompareCartsTitle': 'השוואת סלים',
        'CompareProductsTitle': 'השוואת מוצרים',
        'CancelButton': 'בטל',
        'SaveButton': 'שמור',
        'EnterCartName': 'הכנס שם של סל',
        'Cart': 'סל שלי',
        'AreYouSureWantToDeleteProductTitle': 'למחוק מוצר',
        'AreYouSureWantToDeleteProductText': '?אתה בטוח שאתה רוצה למחוק את המוצר',
        'AreYouSureWantToDeleteCartTitle': 'למחוק סל',
        'AreYouSureWantToDeleteCartText': '?אתה בטוח שאתה רוצה למחוק את הסל',
        'YesButton': 'כן',
        'NoButton': 'לא',
        'CurrencySign': '₪',
        'Kilometer': 'ק"מ',
        'BestShopsHeader': 'השוואת מחירים',
        'FindBestShop': 'לבדוק מחירים',
        'ChooseYourAddressInSettings': 'קודם תבחר מיקומך בהגדרות',
        'MyAddress': 'כתובת שלי',
        'StoreName': 'שם רשת: ',
        'PriceInStore': 'מחיר: ',
        'DistanceToStore': 'מרחק לחנות:',
        'StoreAddress': 'כתובת: ',
        'UpdatingListOfStores': '... מעדכן את רשימת החנויות',
        'LookingForBestShop': 'מחפש את החנות הזולה',
        'MaxShopsToShow': 'כמה חנויות הזולות להציג בהשוואה',
        'MaxShopsOfTheSameBrand': 'כמה חנויות הזולות מכל רשת להציג בהשוואה',
        'ToggleMyLocation': 'השתמש במיקום הנוכחי',
        'DistanceToShop': 'מרחק',
        'CancelSearch': 'ביטול',
        'CannotGetCurrentLocation': 'לא הצחנו לקבל את מיקומל, אנא נסה שנית',
        'DontHaveAllProducts': 'לא נמצא חנות הכולל את כל המוצרים. ',
        'ShowShopsThatPartiallySuit': 'חנוית להלן כוללים את כל המוצרים חוץ מ: ',
        'LocationUpdatePopupTitle': 'עידכון מיקום',
        'NoResults': 'לא נמצאו מוצרים',
        'NoProductsInCart': 'בינתיים אין מוצרים בסל',
        'AddProduct': 'הוסף מוצר',
        'RemoveProducts': 'מחק מוצרים',
        'LocationUpdatePopupText': 'האם אתה רוצה לעדכן את מיקומך?',
        'NavigateToSettings': 'אפשר מיקומך',
        'UserDefinedCarts': 'סלים שלי',
        'PredefinedCarts': 'סלים מוגדרים מראש',
        'PredefinedProductGroups': 'מוצרים פופולריים לפי מחלקות',
        'DoYouWantToOpenSettings':'האם אתה רוצה לפתוח הגדרות ולאשר את מיקומך?',
        'NoInternetConnection' : 'אפליקציה זו דורשת חיבור לאינטרנט'
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