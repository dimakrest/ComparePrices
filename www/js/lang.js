/**
 * Created by dimakrest on 7/9/15.
 */
(function()
{
    document.localize = {};

    var heb = {
        'CartHint1':'לבדיקת המחיר',
        'CartHint2':'תיצור סל חדש',
        'CartHint3':'(+ לחץ על)',
        'CartHint4':'תבחר מתוך',
        'CartHint5':'סלים לדוגמא',
        'ProductHint1':'לבדיקת המחיר',
        'ProductHint2':'חפש מוצר',
        'ProductHint3':'תבחר מתוך',
        'ProductHint4':'מוצרים הפופולריים',
        'Amount':'כמות:',
        'AddressPlaceHolder': 'הכנס כתובת',
        'SearchQueryCartDetailsPlaceholder': 'הקלד שם מוצר',
        'CompareCartsTitle': 'מחיר לסל',
        'CompareProductsTitle': 'מחיר למוצר',
        'CancelButton': 'בטל',
        'SaveButton': 'שמור',
        'EnterCartName': 'הכנס שם של הסל',
        'Cart': 'סל שלי',
        'AreYouSureWantToDeleteProductTitle': 'למחוק מוצר',
        'AreYouSureWantToDeleteProductText': '?אתה בטוח שאתה רוצה למחוק את המוצר',
        'AreYouSureWantToDeleteCartTitle': 'למחוק סל',
        'AreYouSureWantToDeleteCartText': '?אתה בטוח שאתה רוצה למחוק את הסל',
        'YesButton': 'כן',
        'NoButton': 'לא',
        'CurrencySign': '₪',
        'Kilometer': "ק''מ",
        'BestShopsHeader': 'מחיר ל: ',
        'FindBestShop': 'לבדוק מחירים',
        'ChooseYourAddressInSettings': 'קודם תבחר מיקומך בהגדרות',
        'Properties': 'מאפיינים',
        'Or': 'או',
        'CurrentAddress': 'כתובת נוכחית',
        'PriceInStore': 'מחיר: ',
        'StoreAddress': 'כתובת: ',
        'UpdatingListOfStores': '... מעדכן את רשימת החנויות',
        'LookingForBestShop': 'מחפש את החנות הזולה',
        'MaxShopsToShow': 'כמה חנויות הזולות להציג בהשוואה: ',
        'MaxShopsOfTheSameBrand': 'כמה חנויות מכל רשת להציג בהשוואה: ',
        'ToggleMyLocation': 'השתמש במיקום הנוכחי',
        'DistanceToShop': 'מרחק מקסימלי לחנות: ',
        'CancelSearch': 'ביטול',
        'CannotGetCurrentLocation': 'לא הצחנו לקבל את מיקומך, אנא נסה שנית',
        'DontHaveAllProducts': 'חנויות הכוללים רשימה חלקית של המוצרים',
        'PartialComparisonMade': 'ההשוואה נעשית על סמך רשימה חלקית',
        'ShowShopsThatPartiallySuit': 'בחנויות להלן חסרים מוצרים הבאים',
        'LocationUpdatePopupTitle': 'עידכון מיקום',
        'NoResults': 'לא נמצאו מוצרים',
        'Discount': 'הנחה',
        'NoProductsInCart': 'בינתיים אין מוצרים בסל',
        'NoShopWithSuchItemInTheArea': 'באיזור שלך לא נמצא חנות הכולל את המוצר',
        'AddProduct': 'הוסף מוצר',
        'FindProduct': 'חפש מוצר',
        'Mivca': 'מבצע',
        'HaveMivca': 'יש מבצע',
        'For': 'ב',
        'OnlineShop': 'חנות אונליין',
        'RemoveProducts': 'מחק מוצר',
        'LocationUpdatePopupText': 'האם אתה רוצה לעדכן את מיקומך?',
        'NavigateToSettings': 'אפשר מיקומך',
        'UserDefinedCarts': 'סלים שלי',
        'PredefinedCarts': 'סלים לדוגמא',
        'PredefinedProductGroups': 'מוצרים פופולריים לפי מחלקות',
        'DoYouWantToOpenSettings':'האם אתה רוצה לפתוח הגדרות ולאשר את מיקומך?',
        'NoInternetConnection' : 'אפליקציה זו דורשת חיבור לאינטרנט',
        'NoInternetConnectionCannotUpdateStoresInRange': 'אפליקציה זו דורשת חיבור לאינטרנט. עידכון חנויות במרחק הנבחר נכשל.',
        'NoInternetConnectionCannotFinishDownloadingAllStores': 'אפליקציה זו דורשת חיבור לאינטרנט. לא הצלחנו להוריד את כל החנויות לידך.',
        'ContactUs' : 'צרו קשר',
        'HowWeDoThis' : 'איך זה עובד',
        'HowWeDoThisText1' : 'חוק המזון, שנכנס לתוקף בינואר 2015, מחייב את רשתות השיווק לפרסם את המחירים של כל המוצרים, בכל סניף אחת לשעה.',
        'HowWeDoThisText2' : 'איך זה עובד:',
        'HowWeDoThisText3' : '1. תיצרו סל קניות שלכם',
        'HowWeDoThisText4' : '2. תיבחרו מוצרים',
        'HowWeDoThisText5' : '3. תבדקו את המחיר לפני כל יציאה לקניות, המחירים והמבצעים מתעדכנים ע"י הרשתות כל הזמן',
        'HowWeDoThisText6' : '4. קבלו ניווט ע"י וייז לסופר שבחרתם',
        'HowWeDoThisText7' : 'אפשר לבחור מקום שמסביבו אתם רוצים לבדוק את המחירים או פשוט להשתמש במיקום שלכם!'
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