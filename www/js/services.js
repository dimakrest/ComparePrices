/**
 * Created by dimakrest on 6/17/15.
 */

angular.module('ComparePrices.services', ['ngResource'])

    .factory('Shop', ['$resource',
        function($resource){
            return $resource('resources/:shopName.json', {}, {
            })
        }])

    .factory('Recipes', ['$resource',
        function($resource){
            return $resource('resources/recipes/:recipe.json', {}, {
                query: {method:'GET', params:{recipe:'recipes'}, isArray:true}
            });
    }])

    .factory('CalculatePriceForRecipes', ['ComparePricesStorage', 'MiscFunctions',
        function(ComparePricesStorage, MiscFunctions){
            return {
                FindBestShop: function(products) {
                    var productCodesInMyCart = [];
                    var productsStructForCalculation = [];

                    for (var itemCode in products)
                    {
                        productCodesInMyCart.push(itemCode);
                        productsStructForCalculation.push({"ItemCode":itemCode,"Amount":products[itemCode]});
                    }

                    ComparePricesStorage.GetProductsForEachShopByItemCode(productCodesInMyCart, function(result) {
                        MiscFunctions.CalculateBestShopValues(productsStructForCalculation, result)
                    });
                }
            }
    }])

    .factory('ComparePricesStorage', ['Shop', '$q', function (Shop, $q) {

        var createUserCartsTbQuery = 'CREATE TABLE IF NOT EXISTS tbUserCarts (CartID, ItemCode, Amount)';
        var createCartsTbQuery     = 'CREATE TABLE IF NOT EXISTS tbCarts (CartID, CartName)';
        var fileNameToTable = {'am_pm_products'     : 'tbAmPmProducts',
                               'mega_products'      : 'tbMegaProducts',
                               'supersal_products'  : 'tbSuperSalProducts'};
        // TODO: database size + don't want to call init every time
        var db = openDatabase("ComparePricesDB", "1.0", "Global storage", 4 * 1024 * 1024);

            db.transaction(initDB, errorCB, successCB); // creates tables for the first time if required

            initProductList = localStorage.getItem('initProductList') || 1;
            if (initProductList == 1) {
                CreateTbProducts();
                CreateStoresLocationTable();
                CreateProductTablesForShops(); // TODO: call doesn't match the function declaration

                // For now do this only once
                localStorage.setItem('initProductList', 0)
            }

        // TODO: add index
        function CreateTbProducts()
        {
            db.transaction(function(tx) {
                tx.executeSql('DROP TABLE IF EXISTS tbProducts');
                tx.executeSql('CREATE TABLE IF NOT EXISTS tbProducts (ItemCode, ItemName, ImagePath)')
            }, errorCB, successCB);

            Shop.query({shopName:'all_products'}, function (products) {
                db.transaction(function (tx) {
                    var numOfProducts = products.length;
                    // TODO: how better mask ' and "
                    for (var i = 0; i < numOfProducts; i++) {
                        var singleProduct = products[i];
                        var sqlQuery = 'INSERT INTO tbProducts VALUES ("' +
                            singleProduct['ItemCode'] + '", "' +
                            singleProduct['ItemName'].replace(/\"/g, "\'\'") + '", "' +
                            singleProduct['ImagePath'] + '")';
                        tx.executeSql(sqlQuery)
                    }
                }, errorCB, successCB)
            });
        }

        // TODO: add index
        function CreateStoresLocationTable()
        {
            db.transaction(function(tx) {
                tx.executeSql('DROP TABLE IF EXISTS tbStoresLocation');
                tx.executeSql('CREATE TABLE IF NOT EXISTS tbStoresLocation (ChainID, StoreID, StoreName, Lat, Lon, Address, Distance)')
            }, errorCB, successCB);

            Shop.query({shopName:'all_stores_location'}, function (storeLocations) {
                db.transaction(function (tx) {
                    var numOfStoreLocations = storeLocations.length;
                    // TODO: how better mask ' and "
                    for (var i = 0; i < numOfStoreLocations; i++) {
                        var singleStore = storeLocations[i]
                        var sqlQuery = 'INSERT INTO tbStoresLocation VALUES ("' +
                            singleStore['ChainID'] + '", "' +
                            singleStore['StoreID'] + '", "' +
                            singleStore['StoreName'].replace(/\"/g, "\'\'") + '", "' +
                            singleStore['Lat'] + '", "' +
                            singleStore['Lon'] + '", "' +
                            singleStore['Address'].replace(/\"/g, "\'\'") + '", "0")';
                        tx.executeSql(sqlQuery)
                    }
                }, errorCB, successCB)
            });
        }

        // TODO: add index
        function CreateProductTableForSingleShop(tableName, fileName)
        {
            // create table if needed
            db.transaction(function(tx) {
                tx.executeSql('DROP TABLE IF EXISTS ' + tableName);
                tx.executeSql('CREATE TABLE IF NOT EXISTS ' + tableName + ' (ItemCode, ItemPrice)')
            }, errorCB, successCB);
            Shop.query({shopName:fileName}, function (products) {
                db.transaction(function (tx) {
                    var numOfProducts = products.length;
                    // TODO: how better mask ' and "
                    for (var i = 0; i < numOfProducts; i++) {
                        var singleProduct = products[i];
                        var sqlQuery = 'INSERT INTO ' + tableName + ' VALUES ("' +
                            singleProduct['ItemCode'] + '", "' +
                            singleProduct['ItemPrice'] + '")';
                        tx.executeSql(sqlQuery)
                    }
                }, errorCB, successCB)
            });
        }

        function CreateProductTablesForShops(tableName, fileName)
        {
            for (fileName in fileNameToTable)
            {
                var tableName = fileNameToTable[fileName];
                CreateProductTableForSingleShop(tableName, fileName)
            }
        }

        function logError(errorCallBack) {
            return function (err) {
                console.log("DB error: " + err.code);
                if (errorCallBack)
                    errorCallBack(err)
            }

        }

        function initDB(tx) {
            tx.executeSql(createUserCartsTbQuery);
            tx.executeSql(createCartsTbQuery);
        }

        // TODO: add flag to mask all prints
        function errorCB(err) {
            console.log("Error processing SQL: " + err.code);
        }

        function successCB() {
            console.log("Db connection success!");
        }

        function IssueProductsSelectQuery(productCodes, tableName) {
            var d = $q.defer();

            var response = {};
            response.rows = [];
            var selectQuery = 'SELECT * FROM ' + tableName + ' WHERE ItemCode IN (';

            var numOfProducts = productCodes.length;
            for (var i=0; i < numOfProducts; i++) {
                selectQuery += '"' + productCodes[i] + '"';
                if (i != (numOfProducts-1)) {
                    selectQuery += ', '
                }
            }
            selectQuery += ')';

            db.transaction(function (tx) {
                tx.executeSql(selectQuery, [], function (tx, rawresults) {
                    var len = rawresults.rows.length;
                    for (var i = 0; i < len; i++) {
                        response.rows.push(rawresults.rows.item(i));
                    }
                    d.resolve(response);
                });
            });

            return d.promise
        }

        function IssueShopsInRadiusQuery(radius) {
            var d = $q.defer();

            var response = {};
            response.rows = [];
            var selectQuery = "SELECT * FROM tbStoresLocation WHERE Distance < " + radius;

            db.transaction(function (tx) {
                tx.executeSql(selectQuery, [], function (tx, rawresults) {
                    var len = rawresults.rows.length;
                    for (var i = 0; i < len; i++) {
                        response.rows.push(rawresults.rows.item(i));
                    }
                    d.resolve(response);
                });
            });

            return d.promise
        }

        // TODO: succes, error handlers
        return {

            GetAllProducts: function (success) {
                console.log("GetAllProducts: Init");
                var response = {};
                response.rows = [];
                db.transaction(function (tx) {
                    tx.executeSql('SELECT * FROM tbProducts;', [], function (tx, rawresults) {
                        var len = rawresults.rows.length;
                        console.log("GetAllProducts: " + len + " rows found.");
                        for (var i = 0; i < len; i++) {
                            response.rows.push(rawresults.rows.item(i));
                        }
                        if (success) {
                            success(response)
                        }
                    });
                });
                return response
            },

            UpdateCart: function (cartID, newCart) {
                db.transaction(function (tx) {
                    tx.executeSql('DELETE FROM tbUserCarts WHERE CartID = "' + cartID + '"');
                    newCart.forEach(function (singleProduct) {
                        tx.executeSql('INSERT INTO tbUserCarts (CartID, ItemCode, Amount)' +
                            'VALUES ("' + singleProduct['CartID'] + '", "' + singleProduct['ItemCode'] + '", ' + singleProduct['Amount'] + ')')
                    });
                });
            },

            GetMyCart: function (cartID, success, error) {
                console.log("GetMyCart: Init");
                var response = {};
                response.rows = [];
                db.transaction(function (tx) {
                    tx.executeSql('SELECT tbProducts.ItemCode AS ItemCode, ' +
                        'tbProducts.ItemName AS ItemName,' +
                        'tbProducts.ImagePath AS ImagePath,' +
                        'tbUserCarts.Amount AS Amount, ' +
                        'tbUserCarts.CartID AS CartID ' +
                        'FROM tbProducts JOIN tbUserCarts ON tbProducts.ItemCode=tbUserCarts.ItemCode ' +
                        'WHERE tbUserCarts.CartID="' + cartID + '"', [], function (tx, rawresults) {
                        // TODO: do I need the rows thing? if yes wrap this code in some kind of a function
                        var len = rawresults.rows.length;
                        for (var i = 0; i < len; i++) {
                            // Amount is changed in the cart, so I have to make a copy,
                            // otherwise it doesn't work in Safari. The properties are immutable.
                            response.rows.push(angular.copy(rawresults.rows.item(i)));
                        }
                        if (success) {
                            success(response)
                        }
                    });
                }, errorCB, successCB);
                return response
            },

            GetProductsForEachShopByItemCode: function (productCodes, success) {
                $q.all([
                    IssueProductsSelectQuery(productCodes, 'tbAmPmProducts'),
                    IssueProductsSelectQuery(productCodes, 'tbMegaProducts'),
                    IssueProductsSelectQuery(productCodes, 'tbSuperSalProducts')]).then(function (data) {

                    // TODO: is there a way to do this prettier?
                    if (success) {
                        dataAdjusted = {'AM_PM': data[0],
                            'Mega': data[1],
                            'SuperSal': data[2]};
                        success(dataAdjusted)
                    }
                });
            },

            GetProductsPerShopAndShops : function (productCodes, radius, success) {
                $q.all([
                    IssueProductsSelectQuery(productCodes, 'tbAmPmProducts'),
                    IssueProductsSelectQuery(productCodes, 'tbMegaProducts'),
                    IssueProductsSelectQuery(productCodes, 'tbSuperSalProducts'),
                    IssueShopsInRadiusQuery(radius)]).then(function (data) {

                    // TODO: is there a way to do this prettier?
                    if (success) {
                        dataAdjusted = {'AM_PM': data[0],
                                        'Mega': data[1],
                                        'SuperSal': data[2],
                                        'Shops': data[3]};
                        success(dataAdjusted)
                    }
                });
            },

            GetStoresInRadius: function (radius, success) {
                var sqlQuery = "SELECT * FROM tbStoresLocation WHERE Distance < " + radius;
                var response = {};
                response.rows = [];
                db.transaction(function (tx) {
                    tx.executeSql(sqlQuery, [], function (tx, rawresults) {
                        // TODO: do I need the rows thing? if yes wrap this code in some kind of a function
                        var len = rawresults.rows.length;
                        console.log("GetStoresInRadius: " + len + " rows found.");
                        for (var i = 0; i < len; i++) {
                            response.rows.push(rawresults.rows.item(i));
                        }
                        if (success) {
                            success(response)
                        }
                    });
                });
                return response
            },

            GetAllCarts: function (success) {
                var sqlQuery = 'SELECT * FROM tbCarts;';
                var response = {};
                response.rows = [];
                db.transaction(function (tx) {
                    tx.executeSql(sqlQuery, [], function (tx, rawresults) {
                        // TODO: do I need the rows thing? if yes wrap this code in some kind of a function
                        var len = rawresults.rows.length;
                        console.log("GetAllCarts: " + len + " rows found.");
                        for (var i = 0; i < len; i++) {
                            response.rows.push(rawresults.rows.item(i))
                        }
                        if (success) {
                            success(response)
                        }
                    });
                });
                return response
            },

            UpdateCartsList: function (newCart) {
                var sqlQuery = 'INSERT INTO tbCarts VALUES ("' +
                    newCart['CartID'] + '", "' +
                    newCart['CartName'] + '")';

                db.transaction(function (tx) {
                    tx.executeSql(sqlQuery)
                });
            },

            DeleteCart: function (cartID) {
                db.transaction(function (tx) {
                    var sqlQuery = 'DELETE FROM tbCarts WHERE CartID = "' + cartID + '"';
                    tx.executeSql(sqlQuery)
                });
                db.transaction(function (tx) {
                    var sqlQuery = 'DELETE FROM tbUserCarts WHERE CartID = "' + cartID + '"';
                    tx.executeSql(sqlQuery)
                });
            },

            UpdateStoreRadiusFromLocations: function (myLat, myLon) {
                var sqlQuery = "SELECT ChainID, StoreID, Lat, Lon FROM tbStoresLocation;";
                db.transaction(function (tx) {
                    tx.executeSql(sqlQuery, [], function (tx, rawresults) {
                        // TODO: do I need the rows thing? if yes wrap this code in some kind of a function
                        var len = rawresults.rows.length;
                        console.log("CalcStoreInRadius: " + len + " rows found.");
                        for (var i = 0; i < len; i++) {
                            var singleStore = rawresults.rows.item(i);
                            var storeLat = parseFloat(singleStore['Lat']);
                            var storeLon = parseFloat(singleStore['Lon']);

                            var R = 6371; // Radius of the earth in km
                            var dLat = (myLat - storeLat) * Math.PI / 180;  // deg2rad below
                            var dLon = (myLon - storeLon) * Math.PI / 180;
                            var a = 0.5 - Math.cos(dLat) / 2 + Math.cos(storeLat * Math.PI / 180) * Math.cos(myLat * Math.PI / 180) * (1 - Math.cos(dLon)) / 2;
                            var distance = Math.round(R * 2 * Math.asin(Math.sqrt(a)));

                            var sqlQuery = 'UPDATE tbStoresLocation SET Distance=' + distance + ' WHERE ChainID="' + singleStore['ChainID'] + '"AND StoreID="' +
                                singleStore['StoreID'] + '";';
                            tx.executeSql(sqlQuery);
                        }
                    })
                })
            },

            UpdateImageUrl: function(productCode, targetPath) {
                db.transaction(function (tx) {
                    var sqlQuery = 'UPDATE tbProducts SET ImagePath="' + targetPath + '" WHERE ItemCode="' + productCode +'";';
                    tx.executeSql(sqlQuery, successCB, errorCB);
                })
            }
        }
    }])

    // TODO: Using different code for same thing, Slava check and delete this factory
    // + check which functions are not used
    // Amount is integer, no need to call parse int
    .factory('MiscFunctions', ['ComparePricesStorage', function(ComparePricesStorage) {
        return {
            CalculateBestShopValues: function (productCart, productPricesInStore) {
                var priceInAmPM = 0.0;
                productPricesInStore['AM_PM'].rows.forEach(function (product) {
                    var numOfProductsInCart = productCart.length;
                    var amount = 0;
                    for (var i = 0; i < numOfProductsInCart; i++) {
                        if (productCart[i]['ItemCode'] == product['ItemCode']) {
                            // TODO: Amount is integer, no need to call parse int
                            amount = parseInt(productCart[i]['Amount']);
                            break;
                        }
                    }
                    priceInAmPM += parseFloat(product['ItemPrice']) * amount
                });

                var priceInMega = 0.0;
                productPricesInStore['Mega'].rows.forEach(function (product) {
                    var numOfProductsInCart = productCart.length;
                    var amount = 0;
                    for (var i = 0; i < numOfProductsInCart; i++) {
                        if (productCart[i]['ItemCode'] == product['ItemCode']) {
                            amount = parseInt(productCart[i]['Amount']);
                            break;
                        }
                    }
                    priceInMega += parseFloat(product['ItemPrice']) * amount
                });

                var priceInSuperSal = 0.0;
                productPricesInStore['SuperSal'].rows.forEach(function (product) {
                    var numOfProductsInCart = productCart.length;
                    var amount = 0;
                    for (var i = 0; i < numOfProductsInCart; i++) {
                        if (productCart[i]['ItemCode'] == product['ItemCode']) {
                            amount = parseInt(productCart[i]['Amount']);
                            break;
                        }
                    }
                    priceInSuperSal += parseFloat(product['ItemPrice']) * amount
                });

                ComparePricesStorage.GetStoresInRadius(15, function (storesInRadius) {
                    var alertMessage = "AM_PM Price: " + priceInAmPM + "\n" +
                        "Mega Price: " + priceInMega + "\n" +
                        "SuperSal Price: " + priceInSuperSal + "\nStores near you: \n";

                    storesInRadius.rows.forEach(function (singleStore) {
                        alertMessage += "Name " + singleStore['StoreName'] + "Address " + singleStore['Address'] + ", Distance: " + singleStore['Distance'] + "\n"
                    });
                    alert(alertMessage)
                })
            }
        }
    }])

    .factory('PopUpWithDuration', ['$ionicLoading', function($ionicLoading) {
        return function(duration, message)
            {
            var template = "<h2><i class='ion-checkmark-circled'></i></h2><br><small>"+message+"</small>";
            $ionicLoading.show({
                template:'<span style="color:white;">'+template+"</span>",
                noBackdrop:false,
                duration:duration
            });
        }
    }])

    .factory('ShowModal', ['$ionicModal', function($ionicModal) {
        return function($scope, templateURL) {
            $ionicModal.fromTemplateUrl(templateURL, {
                scope: $scope,
                animation: 'slide-in-up',
                backdropClickToClose: true,
                hardwareBackButtonClose: true
            }).then(function (modal) {
                $scope.modal = modal;
                $scope.modal.show();

                $scope.modal.close = function () {
                    $scope.modal.remove()
                };
            });
        }
    }])

    .factory('FindBestShops', ['ComparePricesStorage', '$q', function(ComparePricesStorage, $q) {

        function CalculatePriceForShop(productCart, productPriceInStore) {
            var totalPrice = 0.0;
            productPriceInStore.forEach(function(product) {
                var numOfProductsInCart = productCart.length;
                var amount = 0;
                for (var i=0; i < numOfProductsInCart; i++) {
                    if (productCart[i]['ItemCode'] == product['ItemCode']) {
                        amount = productCart[i]['Amount'];
                        break;
                    }
                }
                totalPrice += parseFloat(product['ItemPrice']) * amount
            });
            return Math.round(totalPrice);
        }

        return function($scope, cart) {
            var d = $q.defer();

            // At first get from myCart only ItemCodes
            var productCodesInMyCart = [];
            cart.forEach(function(singleItem) {
                productCodesInMyCart.push(singleItem['ItemCode'])
            });

            ComparePricesStorage.GetProductsPerShopAndShops(productCodesInMyCart, 150, function(result) {
                var priceInAmPm     = CalculatePriceForShop(cart, result['AM_PM'].rows);
                var priceInMega     = CalculatePriceForShop(cart, result['Mega'].rows);
                var priceInSuperSal = CalculatePriceForShop(cart, result['SuperSal'].rows);
                var minimumPrice    = Math.min(priceInAmPm, priceInMega, priceInSuperSal);

                // TODO: sort rhe shops near array to show at first shops that match the best))
                result['Shops'].rows.forEach(function(shopInfo) {
                    var shopInfoWithPrice = shopInfo;
                    if (shopInfo['StoreName'] == 'AM_PM') {
                        shopInfoWithPrice['Price'] = priceInAmPm;
                        shopInfoWithPrice['IsChecked'] = (priceInAmPm == minimumPrice);
                    } else if (shopInfo['StoreName'] == 'Mega') {
                        shopInfoWithPrice['Price'] = priceInMega;
                        shopInfoWithPrice['IsChecked'] = (priceInMega == minimumPrice);
                    } else {
                        shopInfoWithPrice['Price'] = priceInSuperSal;
                        shopInfoWithPrice['IsChecked'] = (priceInSuperSal == minimumPrice);
                    }
                    $scope.shopsNear.push(shopInfoWithPrice);
                });
                d.resolve();
            });
            return d.promise;
        }
    }])

    // I assume that the device is ready when I get here
    .factory('ImageCache', ['$cordovaFileTransfer', '$cordovaFile', 'ComparePricesStorage',  function ($cordovaFileTransfer, $cordovaFile, ComparePricesStorage) {

        function IsImageCached(imageUrl) {
            // TODO: doesn't work
            // for browser cordova is not defined
            if (cordova == undefined) {
                return imageUrl;
            }

            var splitedImageUrl = imageUrl.split('/');
            var imageName       = splitedImageUrl[(splitedImageUrl.length - 1)];

            return $cordovaFile.checkFile(cordova.file.documentsDirectory, imageName);
        }

        return {
            CacheImage: function (productCode, imageUrl) {
                IsImageCached(imageUrl).then(
                    function(success) { // image is cached, do nothing
                    },
                    function(error) { // image is not cached
                        var splitedImageUrl = imageUrl.split('/');
                        var imageName       = splitedImageUrl[(splitedImageUrl.length - 1)];
                        var targetPath      = cordova.file.documentsDirectory + imageName;
                        var trustHosts      = false;
                        var options         = {};

                        $cordovaFileTransfer.download(imageUrl, targetPath, options, trustHosts)
                            .then(function (result) {
                                ComparePricesStorage.UpdateImageUrl(productCode, targetPath);
                            }, function (err) {

                            }, function (progress) {
                            });
                    }
                );
            },

            DeleteCachedImage: function (imageUrl) {
                var splitedImageUrl = imageUrl.split('/');
                var imageName       = splitedImageUrl[(splitedImageUrl.length - 1)];

                $cordovaFile.removeFile(cordova.file.dataDirectory, imageName)
                    .then(function (success) {
                        // success
                    }, function (error) {
                        // error
                    });

            }
        }
    }]);
