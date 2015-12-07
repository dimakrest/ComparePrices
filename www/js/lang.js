/**
 * Created by dimakrest on 7/9/15.
 */
(function()
{
    document.localize = {};

    var heb = {
        'CartHint1': 'צור סל ',
        'CartHint2': 'בחר מתוך סלים לדוגמא',
        'ProductHint1': 'חיפוש לפי שם ',
        'ProductHint2': 'חיפוש מוצר לפי מחלקה',
        'Amount': 'כמות:',
        'AddressPlaceHolder': 'הכנס כתובת',
        'SearchQueryCartDetailsPlaceholder': "הקלד שם מוצר או מק''ט",
        'CompareCartsTitle': 'סלים',
        'CompareProductsTitle': 'מוצרים',
        'CancelButton': 'בטל',
        'SaveButton': 'שמור',
        'EnterCartName': 'הכנס את שם הסל',
        'Cart': 'הסל שלי',
        'AreYouSureWantToDeleteProductTitle': 'למחוק מוצר',
        'AreYouSureWantToDeleteCartTitle': 'למחוק סל',
        'AreYouSureWantToDeleteCartText': 'אתה בטוח שאתה רוצה למחוק את הסל?',
        'YesButton': 'כן',
        'NoButton': 'לא',
        'CurrencySign': '₪',
        'Kilometer': "ק''מ",
        'BestShopsHeader': 'מחיר ל: ',
        'DeleteCartTitle': 'מחיקת סל',
        'FindBestShop': 'בדיקת מחיר',
        'ChooseYourAddressInSettings': '?סביב איזה כתובת לחפש',
        'Properties': 'מאפיינים',
        'Or': 'או',
        'CurrentAddress': 'איזור החיפוש',
        'PriceInStore': 'מחיר: ',
        'StoreAddress': 'כתובת: ',
        'UpdatingListOfStores': '... מעדכן את המחירים ורשימת החנויות',
        'LookingForBestShop': 'מחפש את החנות הזולה',
        'ToggleMyLocation': 'שימוש במיקום הנוכחי',
        'DistanceToShop': 'חפש חנויות במרחק: ',
        'CancelSearch': 'חזור',
        'CannotGetCurrentLocation': 'המיקום לא נמצא, אנא נסה שנית',
        'DontHaveAllProducts': 'חנויות הכוללות רשימה חלקית של המוצרים',
        'ShowShopsThatPartiallySuit': 'מוצרים חסרים:',
        'HaveAllProducts': 'חנויות הכוללות את הסל במלואו',
        'FullyComparisonMade': 'התוצאות מכילות את הסל המלא',
        'LocationUpdatePopupTitle': 'עידכון מיקום',
        'NoResults': 'לא נמצאו מוצרים',
        'Discount': 'הנחה',
        'NoProductsInCart': 'אין מוצרים בסל',
        'NoShopWithSuchItemInTheArea': 'בחנויות סביבך אין את המוצר המבוקש. הגדל את רדיוס החיפוש או שנה את מיקומך',
        'AddProduct': 'הוספה',
        'FindProduct': 'חיפוש כללי',
        'Mivca': 'מבצע',
        'Price': 'מחיר',
        'SortByPrice': 'לפי מחיר',
        'Distance': 'מרחק',
        'SortByDistance': 'לפי מרחק',
        'HaveMivca': 'יש מבצע',
        'For': 'ב',
        'OnlineShop': 'חנות אונליין',
        'RemoveProducts': 'מחיקה',
        'LocationUpdateYourLastAddress' : 'מיקומך האחרון:',
        'LocationUpdatePopupText': 'מיקומך השתנה, לעדכן?',
        'NavigateToSettings': 'אפשר מיקומך',
        'UserDefinedCarts': 'הסלים שלי',
        'PredefinedCarts': 'סלים לדוגמא',
        'PredefinedProductGroups': 'מוצרים פופולריים לפי מחלקות',
        'DoYouWantToOpenSettings': 'על מנת להשתמש במיקום נוכחי, עליך לאפשר אותנו בהגדרות',
        'NoInternetConnection': 'אפליקציה זו דורשת חיבור לרשת',
        'NoInternetConnectionCannotUpdateStoresInRange': 'עדכון חנויות נכשל. אין חיבור לרשת.',
        'ContactUs': 'צור קשר',
        'HowWeDoThis': 'איך זה עובד',
        'HowWeDoThisText1': 'חוק המזון, שנכנס לתוקף בינואר 2015, מחייב את רשתות השיווק לפרסם את המחירים של כל המוצרים, בכל סניף אחת לשעה.',
        'HowWeDoThisText2': 'איך זה עובד:',
        'HowWeDoThisText3': '1. תיצרו סל קניות שלכם',
        'HowWeDoThisText4': '2. תיבחרו מוצרים',
        'HowWeDoThisText5': '3. תבדקו את המחיר לפני כל יציאה לקניות, המחירים והמבצעים מתעדכנים ע"י הרשתות כל הזמן',
        'HowWeDoThisText6': '4. קבלו ניווט ע"י וייז לסופר שבחרתם',
        'HowWeDoThisText7': 'אפשר לבחור מקום שסביבו אתם רוצים לבדוק את המחירים או פשוט להשתמש במיקום שלכם!',
        'CurrentLocationText': 'מיקום הנוכחי',
        'ErrorEnterAddressAgain': 'הכתובת לא נמצאה, נסה שנית',
        'AddrManualText': 'הכנס כתובת ידנית',
        'SearchTooltipButtonText': 'עוד מוצרים',
        'SearchTooltip1': 'ברשימה למטה מופיעים מוצרים פופולריים.',
        'SearchTooltip2': 'השתמש בחיפוש כדי למצוא את כל המוצרים הקיימים.',
        'NoButtonOpenSettings' : 'לא מאשר',
        'PricesDistribution' : 'טווח מחירים:',
        'NoProductNearYou' : 'אין מוצר לידך',
        'YesButtonOpenSettings' : 'פתח הגדרות'
    }

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