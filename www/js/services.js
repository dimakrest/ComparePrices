/**
 * Created by dimakrest on 6/17/15.
 */

angular.module('ComparePrices.services', ['ngResource'])

    // TODO: read about resources
    .factory('Shop', ['$resource',
        function($resource){
            return $resource('resources/:shopName.json', {}, {
            })
        }])

    .factory('ComparePricesStorage', ['Shop', '$q', function (Shop, $q) {

        var createUserCartsTbQuery = 'CREATE TABLE IF NOT EXISTS tbUserCarts (CartID, ItemCode)'

        var fileNameToTable = {'am_pm_products': 'tbAmPmProducts',
                               'mega_products': 'tbMegaProducts',
                               'supersal_products': 'tbSuperSalProducts'}

        // TODO: database size + don't want to call init every time
        var db = openDatabase("ComparePricesDB", "1.0", "Global storage", 100 * 1024 * 1024);
        db.transaction(initDB, errorCB, successCB); // creates tables for the first time if required

        // TODO: add index
        function CreateTbProducts()
        {
            var createProductsTbQuery = 'CREATE TABLE IF NOT EXISTS tbProducts (ItemCode, ItemName)'
            db.transaction(function(tx) {
                tx.executeSql('DROP TABLE IF EXISTS tbProducts')
                tx.executeSql(createProductsTbQuery)
            }, errorCB, successCB)

            Shop.query({shopName:'all_products'}, function (products) {
                db.transaction(function (tx) {
                    var numOfProducts = products.length
                    // TODO: how better mask ' and "
                    for (var i = 0; i < numOfProducts; i++) {
                        var singleProduct = products[i]
                        var sqlQuery = 'INSERT INTO tbProducts VALUES ("' +
                            singleProduct['ItemCode'] + '", "' +
                            singleProduct['ItemName'].replace(/\"/g, "\'\'") + '")'
                        tx.executeSql(sqlQuery)
                    }
                }, errorCB, successCB)
            });
        }

        // TODO: add index
        function CreateTableForSingleShop(tableName, fileName)
        {
            // create table if needed
            db.transaction(function(tx) {
                tx.executeSql('DROP TABLE IF EXISTS ' + tableName)
                tx.executeSql('CREATE TABLE IF NOT EXISTS ' + tableName + ' (ItemCode, ItemPrice)')
            }, errorCB, successCB)
            Shop.query({shopName:fileName}, function (products) {
                db.transaction(function (tx) {
                    var numOfProducts = products.length
                    // TODO: how better mask ' and "
                    for (var i = 0; i < numOfProducts; i++) {
                        var singleProduct = products[i]
                        var sqlQuery = 'INSERT INTO ' + tableName + ' VALUES ("' +
                            singleProduct['ItemCode'] + '", "' +
                            singleProduct['ItemPrice'] + '")'
                        tx.executeSql(sqlQuery)
                    }
                }, errorCB, successCB)
            });
        }

        function CreateTablesForShops(tableName, fileName)
        {
            for (fileName in fileNameToTable)
            {
                var tableName = fileNameToTable[fileName]
                CreateTableForSingleShop(tableName, fileName)
            }
        }

        initProductList = localStorage.getItem('initProductList') || 1
        if (initProductList == 1) {
            CreateTbProducts()
            CreateTablesForShops()

            // For now do this only once
            localStorage.setItem('initProductList', 0)
        }
        function logError(errorCallBack) {
            return function (err) {
                console.log("DB error: " + err.code)
                if (errorCallBack)
                    errorCallBack(err)
            }

        }

        function initDB(tx) {
            tx.executeSql(createUserCartsTbQuery)
        }


        // TODO: add flag to mask all prints
        function errorCB(err) {
            console.log("Error processing SQL: " + err.code);
        }

        function successCB() {
            console.log("Db connection success!");
        }

        function IsssueSelectQuery(productCodes, tableName) {
            var d = $q.defer();

            var response = {}
            response.rows = []
            var selectQuery = 'SELECT * FROM ' + tableName + ' WHERE ItemCode IN ('

            var numOfProducts = productCodes.length
            for (var i=0; i < numOfProducts; i++) {
                selectQuery += '"' + productCodes[i] + '"'
                if (i != (numOfProducts-1)) {
                    selectQuery += ', '
                }
            }
            selectQuery += ')'

            db.transaction(function (tx) {
                tx.executeSql(selectQuery, [], function (tx, rawresults) {
                    var len = rawresults.rows.length;
                    console.log("GetAllProducts: " + len + " rows found.");
                    for (var i = 0; i < len; i++) {
                        response.rows.push(rawresults.rows.item(i));
                    }
                    d.resolve(response)
                });
            });

            return d.promise
        }

        // TODO: succes, error handlers
        return {

            GetAllProducts: function(success) {
                console.log("GetAllProducts: Init")
                var response = {}
                response.rows = []
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

            InsertItemToCart: function(item) {
                console.log("Adding item to cart" + item)
                db.transaction(function (tx) {
                    tx.executeSql('INSERT INTO tbUserCarts ' +
                        '(CartID, ItemCode)' +
                        'VALUES (' + "1" + ', "' + item['ItemCode']  + '")')
                });
            },

            ClearMyCart: function() {
                console.log("Clear my cart")
                db.transaction(function (tx) {
                    tx.executeSql('DROP TABLE tbUserCarts')
                    tx.executeSql(createUserCartsTbQuery)
                }, logError())
            },

            GetMyCart: function(success, error) {
                console.log("GetMyCart: Init")
                var response = {}
                response.rows = []
                tmp = db.transaction(function (tx) {
                    tx.executeSql('SELECT * FROM tbProducts JOIN tbUserCarts ON tbProducts.ItemCode=tbUserCarts.ItemCode WHERE tbUserCarts.CartID=1', [], function (tx, rawresults) {
                        // TODO: do I need the rows thing? if yes wrap this code in some kind of a function
                        var len = rawresults.rows.length;
                        console.log("GetMyCart: " + len + " rows found.");
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

            GetProductsForEachShopByItemCode: function(productCodes, success) {
                $q.all([
                    IsssueSelectQuery(productCodes, 'tbAmPmProducts'),
                    IsssueSelectQuery(productCodes, 'tbMegaProducts'),
                    IsssueSelectQuery(productCodes, 'tbSuperSalProducts')]).then(function(data) {

                        // TODO: is there a way to do this prettier?
                        if (success) {
                            dataAdjusted = {'AM_PM':data[0],
                                            'Mega' :data[1],
                                            'SuperSal':data[2]}
                            success(dataAdjusted)
                        }
                    }
                )},

            getAllSecrets: function (success, error) {
                console.log("getAllSecrets: Init")
                var response = {}
                response.rows = []
                db.transaction(function (tx) {
                    tx.executeSql('SELECT * FROM tbSecrets', [], function (tx, rawresults) {
                        var len = rawresults.rows.length;
                        console.log("getAllSecrets: " + len + " rows found.");
                        for (var i = 0; i < len; i++) {
                            response.rows.push(rawresults.rows.item(i));
                        }
                        response.rows.sort(function (a, b) {
                            return (a.SecretID * 1 > b.SecretID * 1) ? -1 : 1
                        })
                        if (success)
                            success(response)

                    }, logError(error));
                }, logError(error));
                return response

            }
        }
    }]);
